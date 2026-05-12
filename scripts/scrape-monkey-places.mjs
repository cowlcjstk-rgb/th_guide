import path from "node:path";
import * as cheerio from "cheerio";
import XLSX from "xlsx";

const BASE_URL =
  "https://www.monkeytravel.com/th/totosys/localguide/placeInfo.php?place_id=";

const START_ID = Number(process.env.START_ID ?? 1);
const END_ID = Number(process.env.END_ID ?? 700);
const COOKIE = process.env.MONKEY_COOKIE ?? "";
const OUTPUT_FILE =
  process.env.OUTPUT_FILE ?? `monkey_places_${START_ID}_${END_ID}.xlsx`;

if (!COOKIE) {
  console.error(
    "MONKEY_COOKIE is required. Copy your browser Cookie header value and set MONKEY_COOKIE."
  );
  process.exit(1);
}

function clean(value) {
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function getValueFromCandidates($root, selectors) {
  for (const selector of selectors) {
    const value = clean($root.find(selector).first().val());
    if (value) return value;
  }
  return "";
}

function findRowByLabel($, labelRegex) {
  const matched = $("label, th, td, div")
    .filter((_, el) => labelRegex.test(clean($(el).text())))
    .first();

  if (!matched.length) return null;
  return matched.closest("tr, .row, .form-group, .mb-3, .card-body, section");
}

function extractFromRow($row) {
  if (!$row || !$row.length) return [];
  const values = [];
  $row.find("input, textarea, select").each((_, el) => {
    const $el = $row.find(el).first();
    const value = clean($el.val());
    if (value) values.push(value);
  });
  return values;
}

function parsePlace(html, placeId) {
  const $ = cheerio.load(html);

  const loginDetected =
    /memberLoginForm|User ID|Password/i.test(html) &&
    !/Place Name|Localguide Place Info/i.test(html);

  if (loginDetected) {
    return { placeId, blocked: true };
  }

  const title = clean($("title").text());
  const pageHeading = clean($("h1, h2").first().text());
  if (!/Localguide Place Info|place/i.test(`${title} ${pageHeading}`)) {
    return { placeId, blocked: true };
  }

  const nameRow = findRowByLabel($, /Place Name/i);
  const categoryRow = findRowByLabel($, /Category/i);
  const addressRow = findRowByLabel($, /Address/i);
  const mapRow = findRowByLabel($, /Google Map/i);
  const infoRow = findRowByLabel($, /Basic Info/i);

  const nameValues = extractFromRow(nameRow);
  const categoryValues = extractFromRow(categoryRow);
  const addressValues = extractFromRow(addressRow);
  const mapValues = extractFromRow(mapRow);
  const infoValues = extractFromRow(infoRow);

  const placeNameEn =
    nameValues[0] ||
    getValueFromCandidates($("body"), [
      'input[name*="place_name_en"]',
      'input[name*="name_en"]',
      'input[id*="placeNameEn"]',
    ]);
  const placeNameKo =
    nameValues[1] ||
    getValueFromCandidates($("body"), [
      'input[name*="place_name_ko"]',
      'input[name*="name_ko"]',
      'input[id*="placeNameKo"]',
    ]);

  const categoryMain = categoryValues[0] ?? "";
  const categorySub = categoryValues[1] ?? "";
  const category = clean([categoryMain, categorySub].filter(Boolean).join(" > "));

  const address = addressValues[0] || addressValues[1] || "";

  const latitude =
    mapValues.find((v) => /^-?\d{1,2}\.\d+/.test(v)) ||
    getValueFromCandidates($("body"), ['input[name*="lat"]', 'input[id*="lat"]']);
  const longitude =
    mapValues.find((v) => /^-?\d{1,3}\.\d+/.test(v) && v !== latitude) ||
    getValueFromCandidates($("body"), ['input[name*="lng"]', 'input[id*="lng"]']);
  const googleMapUrl =
    getValueFromCandidates($("body"), ['input[name*="google_map"]', 'input[name*="map_url"]']) ||
    "";

  const basicInfo =
    infoValues.join("\n") ||
    clean(
      $("textarea")
        .filter((_, el) => /basic info/i.test(clean($(el).attr("name") || "")))
        .first()
        .val()
    );

  return {
    place_id: placeId,
    place_name_ko: placeNameKo,
    place_name_en: placeNameEn,
    category,
    address,
    google_map_url: googleMapUrl,
    latitude: clean(latitude),
    longitude: clean(longitude),
    basic_info: basicInfo,
    source_url: `${BASE_URL}${placeId}`,
  };
}

async function fetchHtml(placeId) {
  const res = await fetch(`${BASE_URL}${placeId}`, {
    headers: {
      Cookie: COOKIE,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });

  const html = await res.text();
  return { status: res.status, html };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const rows = [];
  const blockedIds = [];

  for (let id = START_ID; id <= END_ID; id += 1) {
    try {
      const { status, html } = await fetchHtml(id);
      if (status !== 200) {
        console.log(`[${id}] skip - status ${status}`);
        continue;
      }

      const parsed = parsePlace(html, id);
      if (parsed.blocked) {
        blockedIds.push(id);
        console.log(`[${id}] blocked/login`);
      } else {
        rows.push(parsed);
        console.log(
          `[${id}] ok - ${parsed.place_name_en || parsed.place_name_ko || "no-name"}`
        );
      }
    } catch (error) {
      console.log(`[${id}] error - ${error.message}`);
    }

    await sleep(300);
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "places");

  const blockedSheet = XLSX.utils.json_to_sheet(blockedIds.map((place_id) => ({ place_id })));
  XLSX.utils.book_append_sheet(workbook, blockedSheet, "blocked_or_login");

  const outputPath = path.resolve(process.cwd(), OUTPUT_FILE);
  XLSX.writeFile(workbook, outputPath);

  console.log(`\nDone. rows=${rows.length}, blocked=${blockedIds.length}`);
  console.log(`Saved: ${outputPath}`);
}

run();
