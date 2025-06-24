export function getRequestItemId(request?: any): string {
  const { params = {}, body = {}, query = {} } = (request ?? {}) as any;
  const id = params.id ?? body.id ?? query.id;

  return id;
}
