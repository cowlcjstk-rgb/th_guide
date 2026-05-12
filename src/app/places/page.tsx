import PlacesCatalog from "@/components/places-catalog";
import { getPublishedPlaces } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const places = await getPublishedPlaces();

  return (
    <div className="w-full space-y-6">
      <section className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Places</h1>
        <p className="mt-2 text-sm text-slate-600">
          Search and filter Bangkok places by district, category, and vibe tags.
        </p>
      </section>
      <PlacesCatalog places={places} />
    </div>
  );
}
