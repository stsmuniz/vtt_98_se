// TLS da conexão com o Supabase (pooler), compartilhado por server/utils/drizzle.ts, pelos dois
// drizzle.config e por scripts/list-tables.*.
//
// `ssl: 'require'` no postgres.js cifra a conexão mas NÃO confere o certificado
// (rejectUnauthorized = false): qualquer um no meio do caminho poderia se passar pelo banco. O
// pooler usa uma CA própria do Supabase ("Supabase Root 2021 CA"), que não está na lista de CAs do
// sistema — por isso a verificação precisa dela explicitamente. Baixe-a no painel do Supabase
// (Project Settings > Database > SSL Configuration > Download certificate) e informe:
// - SUPABASE_CA_CERT: o conteúdo PEM (na Vercel; quebras de linha podem vir como "\n"), ou
// - SUPABASE_CA_CERT_PATH: o caminho do arquivo (padrão: supabase-ca.crt na raiz do projeto).
// Com a CA, o certificado e o nome do host são conferidos (equivalente a verify-full). Sem ela,
// mantém o comportamento antigo e avisa no log — para um deploy sem a variável não derrubar o app.
const fs = require('node:fs')

let warned = false

function supabaseSsl() {
    let ca = process.env.SUPABASE_CA_CERT
    if (!ca) {
        const path = process.env.SUPABASE_CA_CERT_PATH || 'supabase-ca.crt'
        try {
            ca = fs.readFileSync(path, 'utf8')
        } catch {
            ca = undefined
        }
    }
    if (ca && ca.includes('BEGIN CERTIFICATE')) {
        return { ca: ca.replace(/\\n/g, '\n'), rejectUnauthorized: true }
    }
    if (!warned) {
        warned = true
        console.warn('[db] CA do Supabase não configurada (SUPABASE_CA_CERT / supabase-ca.crt): a conexão é cifrada, mas o certificado do servidor NÃO é conferido.')
    }
    return 'require'
}

module.exports = { supabaseSsl }
