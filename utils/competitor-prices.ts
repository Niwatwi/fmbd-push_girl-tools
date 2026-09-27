const COMPETITOR_PRICE_KEYS = [
  "cellox_satin_4",
  "kleenex_silky_4",
  "scott_safesoft_4",
  "zilk_cotton_6",
  "cellox_2ply_6",
  "scott_extra_6",
  "zilk_cotton_24",
  "cellox_2ply_24",
  "scott_extra_24",
  "maxmo_hang_200",
  "maxmo_3",
  "scott_3_1",
  "maxmo_6_2_green",
  "maxmo_6_2_red",
  "scott_6_2_red",
] as const;

export type CompetitorPriceValues = Record<string, number | string | null>;

export function normalizeCompetitorPrices(
  values?: Record<string, unknown> | null,
): CompetitorPriceValues {
  return Object.fromEntries(
    COMPETITOR_PRICE_KEYS.map((key) => [key, Number(values?.[key]) || 0]),
  );
}
