export function formatCompanyName(companyName: string): Array<string> {
  const company = companyName.split(' ').map((word) => word.replace(/\W/g, ''));
  const name = company[0];
  return company.length > 1
    ? [
        company[0],
        company
          .filter((_, i) => i > 0)
          .join('')
          .toString(),
      ]
    : [name[0], name.slice(1)];
}

export function titlePretty(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
