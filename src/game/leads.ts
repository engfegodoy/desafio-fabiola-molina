/**
 * Cadastro de leads no Supabase (tabela `leads`, ver `supabase/leads.sql`).
 * Usa a API REST direto (sem biblioteca): só INSERT, protegido por RLS.
 * Configuração: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (arquivo .env.local ou secrets do GitHub).
 */
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const leadsConfigured = !!(URL && KEY);

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  const e = normalizeEmail(email);
  return e.length <= 254 && EMAIL_RE.test(e) && !e.includes('..');
}

export interface Lead {
  name: string;
  email: string;
  consent: boolean;
}

/** Salva o lead. Resolve se gravou (ou se o e-mail já estava cadastrado); rejeita com mensagem amigável. */
export async function saveLead(lead: Lead): Promise<void> {
  if (!leadsConfigured) {
    if (import.meta.env.DEV) {
      console.warn('[leads] Supabase não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY): lead não salvo.', lead);
      return;
    }
    throw new Error('Cadastro indisponível no momento. Tente de novo mais tarde.');
  }
  let res: Response;
  try {
    res = await fetch(`${URL!.replace(/\/$/, '')}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        apikey: KEY!,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        name: lead.name.trim(),
        email: normalizeEmail(lead.email),
        consent: lead.consent,
        source: 'desafio-fabiola-molina',
      }),
    });
  } catch {
    throw new Error('Sem conexão. Confira a internet e tente de novo.');
  }
  // 409 = e-mail já cadastrado (jogador voltando): pode jogar normalmente.
  if (res.ok || res.status === 409) return;
  throw new Error('Não foi possível salvar seu cadastro. Tente de novo.');
}
