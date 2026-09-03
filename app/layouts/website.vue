<script setup lang="ts">
</script>
<template>
  <div class="website-wrapper">
    <website-header />
    <main class="main-section">
      <slot/>
    </main>
    <footer>
      <div class="footer-badges">
        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
          <svg width="88" height="31" viewBox="0 0 88 31" xmlns="http://w3.org" style="image-rendering: pixelated; shape-rendering: crispEdges;">
            <!-- Outer Border -->
            <rect width="88" height="31" fill="#000000"/>
            <rect x="1" y="1" width="86" height="29" fill="#FFFFFF"/>
            <!-- Background Split -->
            <rect x="2" y="2" width="24" height="27" fill="#1C1C1C"/> <!-- Left Side for Logo -->
            <rect x="26" y="2" width="60" height="27" fill="#2F2F2F"/> <!-- Right Side for Text -->
            <!-- Supabase Lightning Bolt Logo (Approximate Pixel Art) -->
            <path d="M15 5 L9 16 H14 L12 26 L20 13 H14 Z" fill="#3ECF8E"/>
            <!-- Pixel Text "SUPABASE" -->
            <g fill="#FFFFFF" font-family="monospace, Courier" font-size="8" font-weight="bold">
              <text x="29" y="18" letter-spacing="0.5">SUPABASE</text>
            </g>
            <!-- Border Highlights (Bevel effect) -->
            <line x1="2" y1="2" x2="85" y2="2" stroke="#444444"/>
            <line x1="2" y1="2" x2="2" y2="28" stroke="#444444"/>
          </svg>
        </a>
        <a href="https://nuxt.com" target="_blank" rel="noopener noreferrer">
          <svg width="88" height="31" viewBox="0 0 88 31" xmlns="http://w3.org" style="image-rendering: pixelated; shape-rendering: crispEdges;">
            <rect width="88" height="31" fill="#000000"/>
            <rect x="1" y="1" width="86" height="29" fill="#00DC82"/>
            <rect x="2" y="2" width="84" height="27" fill="#00C58E"/>
            <!-- Detalhe do Logo em linhas escuras -->
            <path d="M12 6 L6 16 H18 Z" fill="#020420"/>
            <path d="M16 11 L11 20 H21 Z" fill="#FFFFFF"/>
            <!-- Texto em contraste -->
            <g fill="#020420" font-family="monospace, Courier" font-size="9" font-weight="900">
              <text x="34" y="18" letter-spacing="1">NUXT.JS</text>
            </g>
            <!-- Brilho retrô de botão -->
            <line x1="2" y1="2" x2="85" y2="2" stroke="#FFFFFF" stroke-opacity="0.5"/>
            <line x1="2" y1="2" x2="2" y2="28" stroke="#FFFFFF" stroke-opacity="0.5"/>
          </svg>
        </a>
        <a href="https://postgresql.org" target="_blank" rel="noopener noreferrer">
          <svg width="88" height="31" viewBox="0 0 88 31" xmlns="http://w3.org" style="image-rendering: pixelated; shape-rendering: crispEdges;">
            <!-- Borda Externa -->
            <rect width="88" height="31" fill="#000000"/>
            <rect x="1" y="1" width="86" height="29" fill="#FFFFFF"/>
            <!-- Divisão do Fundo (Estilo Clássico) -->
            <rect x="2" y="2" width="24" height="27" fill="#12263A"/> <!-- Fundo Escuro para o Logo -->
            <rect x="26" y="2" width="60" height="27" fill="#2F5C85"/> <!-- Azul Postgres para o Texto -->
            <!-- Logotipo Slonik (Elefante em Pixel Art Simplificado) -->
            <!-- Orelha/Cabeça -->
            <rect x="6" y="10" width="10" height="10" fill="#4B89BF"/>
            <rect x="8" y="12" width="10" height="7" fill="#80B3E6"/>
            <!-- Tromba -->
            <path d="M18 15 H21 V19 H19 V17 H18 Z" fill="#80B3E6"/>
            <!-- Olho -->
            <rect x="14" y="13" width="2" height="2" fill="#12263A"/>
            <!-- Presas (Detalhe em Branco) -->
            <rect x="17" y="17" width="2" height="2" fill="#FFFFFF"/>
            <!-- Texto Pixelado "POSTGRES" -->
            <g fill="#12263A" font-family="monospace, Courier" font-size="7" font-weight="bold">
              <text x="30" y="18" letter-spacing="0.5">POSTGRES</text>
            </g>
            <g fill="#FFFFFF" font-family="monospace, Courier" font-size="7" font-weight="bold">
              <text x="29" y="17" letter-spacing="0.5">POSTGRES</text>
            </g>
            <!-- Efeito de Relevo (Bevel) nas Bordas Internas -->
            <line x1="2" y1="2" x2="85" y2="2" stroke="#FFFFFF" stroke-opacity="0.3"/>
            <line x1="2" y1="2" x2="2" y2="28" stroke="#FFFFFF" stroke-opacity="0.3"/>
          </svg>
        </a>
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
          <svg width="88" height="31" viewBox="0 0 88 31" xmlns="http://w3.org" style="image-rendering: pixelated; shape-rendering: crispEdges;">
            <!-- Borda Externa -->
            <rect width="88" height="31" fill="#000000"/>
            <rect x="1" y="1" width="86" height="29" fill="#FFFFFF"/>
            <!-- Miolo Totalmente Escuro -->
            <rect x="2" y="2" width="84" height="27" fill="#000000"/>
            <!-- Mini Triângulo Vercel à Esquerda -->
            <path d="M10 11 L6 18 H14 Z" fill="#FFFFFF"/>
            <!-- Texto em duas linhas estilo micro-selo -->
            <g font-family="monospace, Courier" font-size="7" font-weight="bold">
              <text x="18" y="13" fill="#00FF66">HOSTED ON</text> <!-- Verde terminal -->
              <text x="18" y="22" fill="#FFFFFF">VERCEL</text>
            </g>
            <!-- Brilho de botão retrô nas bordas internas superiores -->
            <line x1="2" y1="2" x2="85" y2="2" stroke="#FFFFFF" stroke-opacity="0.2"/>
            <line x1="2" y1="2" x2="2" y2="28" stroke="#FFFFFF" stroke-opacity="0.2"/>
          </svg>
        </a>
        <a href="https://redis.io" target="_blank" rel="noopener noreferrer">
          <svg width="88" height="31" viewBox="0 0 88 31" xmlns="http://w3.org" style="image-rendering: pixelated; shape-rendering: crispEdges;">
            <!-- Borda Externa -->
            <rect width="88" height="31" fill="#000000"/>
            <rect x="1" y="1" width="86" height="29" fill="#D82C20"/>
            <!-- Miolo Central -->
            <rect x="2" y="2" width="84" height="27" fill="#1F1F1F"/>
            <!-- Detalhe do Logo Minimalista à Esquerda -->
            <rect x="6" y="9" width="6" height="4" fill="#D82C20"/>
            <rect x="6" y="15" width="6" height="4" fill="#D82C20"/>
            <rect x="6" y="21" width="6" height="4" fill="#D82C20"/>
            <!-- Texto em duas linhas estilo micro-selo de performance -->
            <g font-family="monospace, Courier" font-size="7" font-weight="bold">
              <text x="18" y="13" fill="#00FF66">POWERED BY</text> <!-- Verde status ok -->
              <text x="18" y="23" fill="#FFFFFF">REDIS CACHE</text>
            </g>
            <!-- Brilho retrô simulando botão físico -->
            <line x1="2" y1="2" x2="85" y2="2" stroke="#FFFFFF" stroke-opacity="0.3"/>
            <line x1="2" y1="2" x2="2" y2="28" stroke="#FFFFFF" stroke-opacity="0.3"/>
          </svg>
        </a>
        <a href="https://jdan.github.io/98.css/" target="_blank" rel="noopener noreferrer">
          <svg width="88" height="31" viewBox="0 0 88 31" xmlns="http://w3.org" style="image-rendering: pixelated; shape-rendering: crispEdges;">
            <!-- Borda Externa -->
            <rect width="88" height="31" fill="#000000"/>
            <rect x="1" y="1" width="86" height="29" fill="#C0C0C0"/>

            <!-- Divisão Azul da Barra de Título Clássica -->
            <rect x="3" y="3" width="82" height="11" fill="#000080"/>

            <!-- Texto da Barra (Made With) -->
            <g fill="#FFFFFF" font-family="monospace, Courier" font-size="7" font-weight="bold" text-anchor="middle">
              <text x="44" y="11" letter-spacing="0.5">MADE WITH</text>
            </g>

            <!-- Texto do Frame Inferior (98.css) -->
            <g fill="#000000" font-family="monospace, Courier" font-size="9" font-weight="bold" text-anchor="middle">
              <text x="44" y="25" letter-spacing="1">98.css</text>
            </g>

            <!-- Bordas internas 3D -->
            <line x1="1" y1="1" x2="86" y2="1" stroke="#FFFFFF"/>
            <line x1="1" y1="1" x2="1" y2="29" stroke="#FFFFFF"/>
            <line x1="2" y1="28" x2="86" y2="28" stroke="#808080"/>
            <line x1="85" y1="2" x2="85" y2="29" stroke="#808080"/>
          </svg>
        </a>
      </div>
      &copy; 2026 VTT 98 SE. Todos os direitos reservados. Criado por <NuxtLink to="https://github.com/stsmuniz" target="_blank">@stsmuniz</NuxtLink>.
    </footer>
  </div>
</template>
<style lang="css">
.website-wrapper {
  text-align: center;
  font-family: "Times New Roman", Times, serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: space-around;
  align-items: center;
  margin: 0 auto;
  width: 90%;
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: "Times New Roman", Times, serif;
  }
  .main-section {
    flex: 1;
  }
  footer {
    padding: 1rem;
    .footer-badges {
      display: flex;
      gap: 8px;
      justify-content: center;
      align-items: center;
      margin: 2rem auto;
    }
  }
}
@media screen and (min-width: 768px) {
  .website-wrapper {
    width: 70%;
  }
}
@media screen and (min-width: 1024px) {
  .website-wrapper {
    width: 50%;
  }
}
</style>