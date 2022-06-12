export const getWordWithCapitalFirstLetter = (word) => {
  if (!word) return word;

  if (word.length === 1) return word.toUpperCase();

  return word[0].toUpperCase() + word.slice(1);
};