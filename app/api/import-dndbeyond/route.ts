import { NextRequest, NextResponse } from "next/server";
import { mapDndBeyondCharacter } from "../../lib/data/dndbeyondImporter";

/**
 * GET /api/import-dndbeyond?id=<characterId>
 *
 * Fetches a public D&D Beyond character by ID and maps it to the app's Pc type.
 * The character must have sharing enabled (privacyType 3) on D&D Beyond.
 *
 * Returns: { pc: Omit<Pc, "id"> }
 * Errors:  { error: string } with appropriate HTTP status
 */
export async function GET(req: NextRequest) {
  const characterId = req.nextUrl.searchParams.get("id");

  if (!characterId || !/^\d+$/.test(characterId)) {
    return NextResponse.json(
      { error: "Invalid character ID — must be a numeric D&D Beyond character ID" },
      { status: 400 },
    );
  }

  const ddbUrl = `https://character-service.dndbeyond.com/character/v5/character/${characterId}`;

  let res: Response;
  try {
    res = await fetch(ddbUrl, {
      headers: { Accept: "application/json", "User-Agent": "dnd-dm-app-importer" },
      // 10-second timeout via AbortSignal
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return NextResponse.json(
      { error: `Could not reach D&D Beyond: ${msg}` },
      { status: 502 },
    );
  }

  if (!res.ok) {
    if (res.status === 429) {
      return NextResponse.json(
        { error: "D&D Beyond rate limit hit. Please wait a minute and try again." },
        { status: 429 }
      );
    }
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        { error: "Character is private. Enable sharing on D&D Beyond first." },
        { status: 403 },
      );
    }
    if (res.status === 404) {
      return NextResponse.json({ error: "Character not found on D&D Beyond." }, { status: 404 });
    }
    return NextResponse.json(
      { error: `D&D Beyond returned HTTP ${res.status}` },
      { status: 502 },
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return NextResponse.json(
      { error: "D&D Beyond returned an unexpected response format" },
      { status: 502 },
    );
  }

  try {
    const pc = mapDndBeyondCharacter(json);
    return NextResponse.json({ pc });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown mapping error";
    return NextResponse.json({ error: `Import failed: ${msg}` }, { status: 422 });
  }
}
