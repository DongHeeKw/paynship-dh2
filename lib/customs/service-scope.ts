// Service exclusions, not a claim that these chapters can never be imported.
// HS chapters 01–24 cover animal/plant/food goods and beverages/tobacco; chapter
// 30 covers pharmaceutical products. Special national chapters need a separate
// broker calculation outside the current ad-valorem quote model.
export function customsCodeInServiceScope(hsCode: string) {
  const chapter = Number(hsCode.slice(0, 2));
  return /^\d{6,12}$/.test(hsCode) && chapter >= 25 && chapter <= 97 && chapter !== 30 && chapter !== 77;
}
