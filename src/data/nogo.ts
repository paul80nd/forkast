// Household no-go allergens: recipes carrying any of these are never planned, suggested, or
// surfaced as related. Also excluded upstream when the dataset is built — this is the single
// runtime source the app layer + Plan picker share (belt-and-braces), so the filters can't drift
// apart. Keep it firewall-clean: a generic allergen label, not provider data.
export const NOGO_ALLERGENS = ['fish']
