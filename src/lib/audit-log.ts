type AuditPayload = Record<string, unknown>;

export function auditLog(event: string, payload: AuditPayload = {}) {
  console.info(
    JSON.stringify({
      level: "info",
      event,
      payload,
      timestamp: new Date().toISOString(),
    })
  );
}
