// Entrega365 — Community moderation rules
// Kept outside /api so it does not consume a Vercel Serverless Function slot.

const RULES = [
  {
    category: 'política',
    words: [
      'politica','política','eleicao','eleição','eleicoes','eleições','eleitoral',
      'presidente','presidencia','presidência','governo','governador','prefeito',
      'prefeita','vereador','vereadora','deputado','deputada','senador','senadora',
      'congresso','senado','camara dos deputados','câmara dos deputados','ministro',
      'ministra','partido politico','partido político','campanha eleitoral','voto',
      'votacao','votação','direita','esquerda','petista','bolsonarista','stf',
      'supremo tribunal federal','lula','bolsonaro','jair'
    ]
  },
  {
    category: 'sexual/pornográfico',
    words: [
      'sexo','sexual','pornografia','pornografico','pornográfico','porno','pornô',
      'porn','nude','nudes','nudismo','nudez','xxx','xvideos','redtube','onlyfans',
      'masturbacao','masturbação','prostituicao','prostituição','escort','fetiche',
      'erotico','erótico','conteudo adulto','conteúdo adulto','18+','sexo oral'
    ]
  },
  {
    category: 'linguagem obscena',
    words: [
      'porra','caralho','foder','fode','fodase','foda-se','puta','putaria','merda',
      'buceta','bucet','cuzao','cuzão','viado','veado','piranha','cacete','desgraca',
      'desgraça','filho da puta','fdp','vai tomar no cu','vai se foder','vai se fuder',
      'arrombado','arrombada','otario','otário','idiota','imbecil','babaca'
    ]
  },
  {
    category: 'conduta inadequada',
    words: [
      'vou te matar','vou matar você','vou matar voce','te mato','ameaça','ameaca',
      'ameaçar','ameacar','racismo','racista','homofobia','homofobico','homofóbico',
      'xenofobia','xenofobico','xenofóbico','nazista','nazismo','incitar violencia',
      'incitar violência','violencia contra','violência contra','estupro','estuprar',
      'pedofilia','pedófilo','pedofilo','doxxing','hackear','golpear','agredir'
    ]
  }
];

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/https?:\/\//g, ' ')
    .replace(/[._\-/\\|:;,!?()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function moderateCommunityContent({ text = '', url = '' } = {}) {
  const value = normalize(`${text} ${url}`);
  if (!value) return { allowed: true };

  for (const rule of RULES) {
    for (const word of rule.words) {
      const needle = normalize(word);
      if (!needle) continue;
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, 'i');
      if (pattern.test(value)) {
        return {
          allowed: false,
          category: rule.category,
          error: `Publicação não permitida: conteúdo relacionado a ${rule.category} não é permitido na Comunidade Entrega365.`
        };
      }
    }
  }

  return { allowed: true };
}
