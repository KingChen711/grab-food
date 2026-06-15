export const bigintTransformer = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null ? null : parseInt(v, 10)),
}
