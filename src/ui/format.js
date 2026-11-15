// Portuguese dates come out lowercase ("quinta-feira, 12 de novembro"): capitalise only the first letter.
export const capitalizeFirst = (text) => {
  const value = String(text ?? "");
  return value ? value[0].toLocaleUpperCase("pt-PT") + value.slice(1) : value;
};
