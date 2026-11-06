/**
 * E-mails transacionais via SendPulse (API SMTP, https://sendpulse.com/integrations/api/smtp).
 *
 * Variáveis de ambiente (também nas env vars da Vercel):
 *  - SENDPULSE_API_ID / SENDPULSE_API_SECRET: credenciais da API REST (Configurações da conta > API);
 *  - SENDPULSE_FROM_EMAIL: remetente, precisa estar verificado no SendPulse (ex.: nao-responda@vtt98se.com.br);
 *  - SENDPULSE_FROM_NAME: opcional (padrão "VTT 98 SE").
 *
 * Sem credenciais, fora de produção, o e-mail só é escrito no log do servidor (o link de
 * confirmação/recuperação fica clicável no terminal). Em produção, a falta delas é erro.
 */

const API = 'https://api.sendpulse.com'

let cachedToken: { value: string, expiresAt: number } | null = null

function configured() {
    return Boolean(process.env.SENDPULSE_API_ID && process.env.SENDPULSE_API_SECRET && process.env.SENDPULSE_FROM_EMAIL)
}

async function accessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value
    const res = await fetch(`${API}/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: process.env.SENDPULSE_API_ID,
            client_secret: process.env.SENDPULSE_API_SECRET,
        }),
    })
    if (!res.ok) throw new Error(`SendPulse: falha ao autenticar (HTTP ${res.status})`)
    const data = await res.json() as { access_token: string, expires_in: number }
    cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
    return data.access_token
}

export type MailMessage = {
    to: { email: string, name?: string }
    subject: string
    html: string
    text: string
}

export async function sendMail(message: MailMessage): Promise<void> {
    if (!configured()) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('SendPulse não configurado (SENDPULSE_API_ID, SENDPULSE_API_SECRET, SENDPULSE_FROM_EMAIL).')
        }
        console.info(`[mailer] SendPulse não configurado; e-mail para ${message.to.email} não enviado.\n${message.subject}\n${message.text}`)
        return
    }

    const send = async (token: string) => fetch(`${API}/smtp/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            email: {
                subject: message.subject,
                from: { name: process.env.SENDPULSE_FROM_NAME || 'VTT 98 SE', email: process.env.SENDPULSE_FROM_EMAIL },
                to: [{ name: message.to.name ?? '', email: message.to.email }],
                html: Buffer.from(message.html, 'utf-8').toString('base64'),
                text: message.text,
            },
        }),
    })

    let res = await send(await accessToken())
    if (res.status === 401) { // token revogado antes de expirar: renova uma vez
        cachedToken = null
        res = await send(await accessToken())
    }
    if (!res.ok) throw new Error(`SendPulse: falha ao enviar e-mail (HTTP ${res.status}): ${await res.text().catch(() => '')}`)
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Layout comum dos e-mails: cartão simples com botão de ação e o link por extenso (para clientes que bloqueiam botões). */
function actionMail(opts: { name: string, intro: string, button: string, url: string, outro: string }): Pick<MailMessage, 'html' | 'text'> {
    const name = escapeHtml(opts.name)
    const url = escapeHtml(opts.url)
    const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#008080;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" align="center" width="100%" style="max-width:520px;background:#c0c0c0;border:2px solid #fff;border-right-color:#404040;border-bottom-color:#404040;">
<tr><td style="background:#000080;color:#fff;padding:4px 8px;font-weight:bold;">VTT 98 SE</td></tr>
<tr><td style="padding:20px;color:#000;font-size:14px;line-height:1.5;">
<p>Olá, ${name}!</p><p>${escapeHtml(opts.intro)}</p>
<p style="text-align:center;margin:24px 0;"><a href="${url}" style="display:inline-block;padding:8px 24px;background:#c0c0c0;color:#000;text-decoration:none;font-weight:bold;border:2px solid #fff;border-right-color:#404040;border-bottom-color:#404040;">${escapeHtml(opts.button)}</a></p>
<p style="font-size:12px;">Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="${url}">${url}</a></p>
<p style="font-size:12px;color:#404040;">${escapeHtml(opts.outro)}</p>
</td></tr></table></body></html>`
    const text = `Olá, ${opts.name}!\n\n${opts.intro}\n\n${opts.button}: ${opts.url}\n\n${opts.outro}\n\nVTT 98 SE`
    return { html, text }
}

export function sendVerificationMail(user: { email: string, name: string }, url: string) {
    return sendMail({
        to: { email: user.email, name: user.name },
        subject: 'Confirme o seu e-mail - VTT 98 SE',
        ...actionMail({
            name: user.name,
            intro: 'Para ativar a sua conta no VTT 98 SE, confirme o seu endereço de e-mail.',
            button: 'Confirmar e-mail',
            url,
            outro: 'O link vale por 1 hora. Se você não criou uma conta no VTT 98 SE, ignore esta mensagem.',
        }),
    })
}

export function sendPasswordResetMail(user: { email: string, name: string }, url: string) {
    return sendMail({
        to: { email: user.email, name: user.name },
        subject: 'Redefinir a sua senha - VTT 98 SE',
        ...actionMail({
            name: user.name,
            intro: 'Recebemos um pedido para redefinir a senha da sua conta no VTT 98 SE.',
            button: 'Redefinir senha',
            url,
            outro: 'O link vale por 1 hora. Se você não fez esse pedido, ignore esta mensagem: a sua senha continua a mesma.',
        }),
    })
}
