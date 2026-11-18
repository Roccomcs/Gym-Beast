export const starters = ['Dragón', 'Cocodrilo', 'Oso', 'Lobo'] as const
export const companions = [...starters, 'Zorro', 'Ajolote', 'Tigre', 'Fénix'] as const
export const petSources: Record<string, string> = {
  Dragón: 'dragon', Cocodrilo: 'crocodile', Oso: 'bear', Lobo: 'wolf',
  Zorro: 'fox', Ajolote: 'axolotl', Tigre: 'tiger', Fénix: 'phoenix',
}
