export function atributosDeEscrituraLiteral(campo: Element | null) {
  return {
    autocapitalize: campo?.getAttribute('autocapitalize'),
    autocorrect: campo?.getAttribute('autocorrect'),
    spellcheck: campo?.getAttribute('spellcheck'),
  };
}

export const ESCRITURA_LITERAL = {
  autocapitalize: 'none',
  autocorrect: 'off',
  spellcheck: 'false',
};
