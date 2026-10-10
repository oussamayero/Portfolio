// Typographie française appliquée aux textes des fichiers de contenu :
// apostrophes typographiques et espaces insécables avant la ponctuation haute.
const NBSP = ' ';
const NNBSP = ' ';

export function typo(text: string): string {
  return text
    .replace(/'/g, '’')
    .replace(/ ([?!;])/g, `${NNBSP}$1`)
    .replace(/ :/g, `${NBSP}:`)
    .replace(/« /g, `«${NBSP}`)
    .replace(/ »/g, `${NBSP}»`);
}
