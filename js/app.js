/*
 * Designer Fechaduras — aplicação principal
 * Arquitetura: estado local -> renderização -> eventos -> navegação/modal/orçamento.
 * Este arquivo mantém a lógica original, com responsabilidades centralizadas para facilitar manutenção.
 */
(() => {
  // Aguarda a sincronização do catálogo com a API antes de montar os índices.
  // Se a API estiver indisponível, products.js mantém o catálogo local como fallback.
  const ready = window.DF_PRODUCTS_READY || Promise.resolve();
  ready.then(() => {
  const $ = id => document.getElementById(id);
  const normalize = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const SEARCH_ALIASES = [
    ["visor de porta","olho magico","visor","visor de porta digital"],
    ["fechadura eletronica","fechadura digital","smart lock","digital lock"],
    ["fechadura inteligente","fechadura digital","smart lock"],
    ["dobradica vai vem","dobradica vai e vem","vai e vem","vai-vem"],
    ["dobradica invisivel","dobradica invisivel","invisivel"],
    ["dobradica hamburguesa","hamburguesa"],
    ["puxador h","puxador tipo h","tipo h"],
    ["puxador u","puxador tipo u","tipo u"],
    ["mola aerea","mola aérea","mola"],
    ["olho magico","visor de porta","visor"]
  ];
  const canonicalMaterial = value => {
    const n=normalize(value);
    if(n.includes("zamak")) return "Zamak";
    if(n.includes("inox") || n.includes("aco inox")) return "Inox";
    if(n.includes("aco carbono") || n.includes("carbono")) return "Aço Carbono";
    return String(value||"").trim();
  };
  const productMaterials = p => [...new Set([p?.material,p?.basic?.Material,p?.technical?.Material].filter(Boolean).map(canonicalMaterial))];
  const productColors = p => [...new Set((Array.isArray(p?.colors)?p.colors.map(c=>c?.name).filter(Boolean):[]).concat(p?.color?[p.color]:[]))];
  const COLOR_FILTERS = [
    {key:"Antique", label:"Antique", hex:"#8a6b4a"},
    {key:"Inox Polido", label:"Inox Polido", hex:"#d8dde0"},
    {key:"Inox Escovado", label:"Inox Escovado", hex:"#9fa5a8"},
    {key:"Inox Preto Fosco", label:"Inox Preto Fosco", hex:"#202020"},
    {key:"Inox", label:"Inox", hex:"#b8bec1"},
    {key:"Dourado", label:"Dourado", hex:"#c9a24d"},
    {key:"Aço Carbono Antique", label:"Aço Carbono Antique", hex:"#75563d"},
    {key:"Aço Carbono Cromado", label:"Aço Carbono Cromado", hex:"#c5c8ca"},
    {key:"Aço Carbono Escovado", label:"Aço Carbono Escovado", hex:"#85898b"},
    {key:"Aço Carbono Preto", label:"Aço Carbono Preto", hex:"#171717"},
    {key:"Marrom", label:"Cor Marrom", hex:"#704b37"},
    {key:"Branco", label:"Cor Branco", hex:"#f3f1eb"},
    {key:"Bege", label:"Cor Bege", hex:"#d8c4a4"},
    {key:"Preto", label:"Cor Preto", hex:"#111111"},
    {key:"Natural", label:"Cor Natural", hex:"#b99169"}
  ];
  const canonicalColorKeys = p => {
    const raw = productColors(p).map(normalize);
    const material = productMaterials(p).map(normalize).join(" ");
    const out = new Set();
    const has = (...terms) => terms.some(t => raw.some(c => c.includes(normalize(t))));
    const isInox = material.includes("inox") || raw.some(c=>c.includes("inox"));
    const isCarbon = material.includes("aco carbono") || material.includes("carbono");
    if(has("antique")) out.add("Antique");
    if(isInox && has("inox polido")) out.add("Inox Polido");
    if(isInox && has("inox escovado")) out.add("Inox Escovado");
    if(isInox && has("preto fosco")) out.add("Inox Preto Fosco");
    if(isInox && has("inox") && !has("inox polido","inox escovado","preto fosco")) out.add("Inox");
    if(has("dourado","dourada")) out.add("Dourado");
    if(isCarbon && has("antique")) out.add("Aço Carbono Antique");
    if(isCarbon && has("cromado","cromada")) out.add("Aço Carbono Cromado");
    if(isCarbon && has("escovado","escovada")) out.add("Aço Carbono Escovado");
    if(isCarbon && has("preto","preto fosco")) out.add("Aço Carbono Preto");
    if(has("marrom")) out.add("Marrom");
    if(has("branco")) out.add("Branco");
    if(has("bege")) out.add("Bege");
    if(has("preto")) out.add("Preto");
    if(has("natural")) out.add("Natural");
    return [...out];
  };
  const STATIC_BRANDS = ["DSs","ZEN","VIRTUS LOCK","Häfele","IMAB","PADO","STAM","HAGA","UNIÃO MUNDIAL","3F","ASSA ABLOY","PAPAIZ","FERMAX","GRANDCASA","PERFIL ROLD","SILVANA ASSA ABLOY", "YALE", "A FONTE"];
  const CART_GUEST_KEY = "df-cart-guest";
  const CART_KEY_PREFIX = "df-cart-user-";
  function cartStorageKey(userId="guest"){ return userId ? `${CART_KEY_PREFIX}${String(userId).replace(/[^a-zA-Z0-9_-]/g,"_")}` : CART_GUEST_KEY; }
  function readCart(key=CART_GUEST_KEY){
    try{
      let raw=localStorage.getItem(key);
      if(key===CART_GUEST_KEY && !raw){
        const legacy=localStorage.getItem("df-cart");
        if(legacy){ raw=legacy; localStorage.setItem(CART_GUEST_KEY,legacy); localStorage.removeItem("df-cart"); }
      }
      const value=JSON.parse(raw||"[]"); return Array.isArray(value) ? value : [];
    }catch{return []}
  }
  function normalizeCartItem(item){ return {id:String(item?.id||""),qty:Math.max(1,parseInt(item?.qty,10)||1),colorName:String(item?.colorName||""),colorCode:String(item?.colorCode||""),size:String(item?.size||""),furo:String(item?.furo||"")}; }
  function mergeCarts(base,incoming){
    const out=(Array.isArray(base)?base:[]).map(normalizeCartItem).filter(x=>x.id);
    for(const raw of (Array.isArray(incoming)?incoming:[])){
      const item=normalizeCartItem(raw); if(!item.id) continue;
      const same=out.find(x=>x.id===item.id&&x.colorName===item.colorName&&x.size===item.size&&x.furo===item.furo);
      if(same) same.qty=Math.min(9999,same.qty+item.qty); else out.push(item);
    }
    return out;
  }
  const state = { lang: "pt", slide: 0, catPage: 0, activeTag: "", activeCategory: "", digitalInstall: "", accessorySubcategory: "", hingeSubcategory: "", hingeMaterialSubcategory: "", hingeCornerSubcategory: "", handlesType: "", handlesSize: "", mechanicalLockType: "", mechanicalDoor: "", menuProductFilter: "", cart: readCart(), cartOwnerId: null, cartStorageKey: CART_GUEST_KEY, currentProduct: null, selectedColor: null, selectedFuro: null, mechanicalCarouselTimer: null, mechanicalCarouselIndex: 0, digitalShowAllTimer: null, showAllCategory: true, selectedSize: null, handleTypeCarouselTimers: [], productCardCarouselTimers: [] };

  // Índices estáveis para evitar buscas lineares e JSON.stringify a cada interação.
  // A camada de categorização automática é instalada por products.js e já
  // normaliza todo o catálogo antes destes índices serem criados.
  const PRODUCTS_BY_ID=new Map(PRODUCTS.map(p=>[p.id,p]));
  const PRODUCT_SEARCH_TEXT=new Map(PRODUCTS.map(p=>[p.id,normalize(JSON.stringify(p)+" "+(p.name||"")+" "+(p.description||""))]));

  // Busca inteligente: entende sinônimos, termos equivalentes, pequenas
  // diferenças de escrita e procura também dentro das descrições/técnicos.
  // Tudo roda localmente, sem API externa, para manter o site rápido.
  const SEARCH_SYNONYMS = {
    "visor":["visor de porta","olho magico","olho magico de porta","visor de porta digital"],
    "visao":["olho magico","visor","visor de porta"],
    "olho":["olho magico","visor de porta"],
    "olho magico":["visor","visor de porta","olho magico"],
    "fechadura eletronica":["fechadura digital","smart lock","fechadura inteligente"],
    "fechadura inteligente":["fechadura digital","fechadura eletronica","smart lock"],
    "smart lock":["fechadura digital","fechadura eletronica","fechadura inteligente"],
    "puxador":["puxador de porta","puxador tubular","puxador tipo h","puxador tipo u"],
    "dobradica":["dobradica de porta","dobradica inox","dobradica aco carbono"],
    "mola":["mola aerea","mola de piso"],
    "trava":["ferrolho","trinco","fecho"],
    "trinco":["trava","ferrolho","fecho"],
    "ferrolho":["trava","trinco","fecho"],
    "macaneta":["fechadura","maçaneta","puxador"]
  };
  // Mapa de intenção gerado a partir dos 103 produtos do catálogo.
  // Cada produto possui termos equivalentes, formas coloquiais, materiais,
  // aplicações, medidas e variações de escrita para a busca.
  const SEARCH_INTENT_RULES=[{"id":"puxador-tipo-u-50x20-2m","terms":["2 metros","20 mm","2000 mm","2020 mm","2020 mm 50 mm 20 mm","40 mm","50 20","aco inox 304","alca","dourado inox polido preto fosco e inox escovado","dss","handle","handles","metros","portas pivotantes portas comuns de madeira portas de vidro portas de aluminio portas de aco portas de correr e portoes","portas pivotantes portas de madeira vidro aluminio aco portas de correr e portoes","puchador","puxador","puxador em u","puxador tipo u 50 x 20 2 metros","puxador u","puxadores","tipo","tipo u"]},{"id":"puxador-tipo-u-50x20-1-8m","terms":["1 80 metros","1800 mm","1820 mm","1820 mm 50 mm 20 mm","20 mm","40 mm","50 20","aco inox 304","alca","dourado inox polido preto fosco e inox escovado","dss","handle","handles","metros","portas pivotantes portas comuns de madeira portas de vidro portas de aluminio portas de aco portas de correr e portoes","portas pivotantes portas de madeira vidro aluminio aco portas de correr e portoes","puchador","puxador","puxador em u","puxador tipo u 50 x 20 1 80 metros","puxador u","puxadores","tipo","tipo u"]},{"id":"puxador-u-50x20-1-5m","terms":["1 50 metros","1480 mm","1500 mm","1500 mm 50 mm 20 mm","20 mm","40 mm","50 20","aco inox 304","alca","dourado inox polido preto fosco e inox escovado","dss","handle","handles","metros","portas pivotantes portas comuns de madeira portas de vidro portas de aluminio portas de aco portas de correr e portoes","portas pivotantes portas de madeira vidro aluminio aco portas de correr e portoes","puchador","puxador","puxador em u","puxador u","puxador u 50 20 1 50 metros","puxadores","tipo u"]},{"id":"puxador-u-50x20-1-2m","terms":["1 20 metros","1180 mm","1200 mm","1200 mm 50 mm 20 mm","20 mm","40 mm","50 20","aco inox 304","alca","dourado inox polido preto fosco e inox escovado","dss","handle","handles","metros","portas pivotantes portas comuns de madeira portas de vidro portas de aluminio portas de aco portas de correr e portoes","portas pivotantes portas de madeira vidro aluminio aco portas de correr e portoes","puchador","puxador","puxador em u","puxador tipo u 50 x 20 1 20 metros","puxador u","puxadores","tipo","tipo u"]},{"id":"fds-50-pado","terms":["1 ano","30 a 45 mm","4 pilhas aa","ate 50 cartoes e 5 senhas","baixo consumo de energia","biometria","biometrica","biometrico","cartao rfid e senha","de sobrepor","dedo","digital","eletronica","eletronico","fds","fecha dura","fechadra","fechadua","fechadura","fechadura digital de sobrepor fds 50","fechadura eletrica digital de sobrepor","fechaduras","impressao digital","inteligente","interface sonora e alarme contra intrusos","lock","madeira metal","nao","nao utilizar bateria recarregavel nao molhar o produto","pado","polimero de engenharia","porta de giro porta pivotante","portas com espessura de 30mm a 45mm","portas de abrir","preto","residencial e comercial","senha ate 5 senhas de 3 a 12 digitos cartao rfid ate 50 cartoes cadastrados","sim","sim 9v","simples instalacao e configuracao","smart lock","smartlock","sobrepor","sobreposta","tecnologia seguranca e otimo custo beneficio","zamac polimero aco"]},{"id":"fde-600w-pado","terms":["1 ano","1 conjunto fechadura 1 gateway","30 a 75 mm","4 pilhas aa","600w","a agua e poeira","acompanha 2 chaves","alta seguranca","amazon alexa aplicativo bluetooth biometria ate 200 digitais cadastradas e ate 150 senhas numericas cartao rfid ate 200 cartoes cadastrados","biometria","biometria senha cartao chave mecanica e aplicativo","biometrica","biometrico","com","compativel com furacao de maquina existente","de embutir","dedo","digital","digital locking","eletronica","eletronico","embutida","embutir","externa interna","fde","fecha dura","fechadra","fechadua","fechadura","fechadura digital de embutir","fechadura digital de embutir fde 600w com gateway","fechaduras","gateway","impressao digital","inteligente","lock","madeira metal","micro usb","nao utilizar bateria recarregavel nao molhar o produto","pado","porta de giro","portas com espessura entre 30 mm a 75 mm","portas de abrir","portas externas de madeira","preto","sim","smart lock","smartlock","zamac polimero aco"]},{"id":"texas-virtus-lock","terms":["12 meses","30 a 70 mm","30 mm a 70 mm","4 pilhas aa","acompanha 2 chaves","alimentacao via usb c","ate 50 digitais","biometria","biometria senha cartao tag aplicativo tuya smart e chave mecanica","biometria senha cartao tag rfid aplicativo e chave mecanica","biometrica","biometrico","capacidade para 100 senhas de 6 a 8 digitos","codigo","com","dedo","digital","eletronica","eletronico","embutir","fecha dura","fechadra","fechadua","fechadura","fechadura digital texas com biometria e senha","fechadura eletronica digital","fechaduras","historico de acessos e cadastro de usuarios","impressao digital","inteligente","lock","madeira","navegacao por audio","navegacao por audio e instalacao simples","pin","portas de abrir","residencial comercial e escritorios","senha","sensor semicondutor capacidade para 50 digitais","smart lock","smartlock","suporta ate 200 cartoes acompanha 2 unidades","texas","tuya smart","usb c","virtus lock","wi fi 2 4 ghz"]},{"id":"fde-800-vision-pado","terms":["2 baterias recarregaveis de 7 4 v","800","alta seguranca tecnologia avancada e praticidade","ate 50 perfis","biometria","biometrica","biometrico","com","compativel com portas de abertura para a esquerda ou direita tanto internas quanto externas","dedo","digital","eletronica","eletronico","embutir","entrada usb c","face","facial","fde","fecha dura","fechadra","fechadua","fechadura","fechadura digital com facial fde 800 vision","fechadura digital premium push pull","fechaduras","funcao de trancamento automatico e feedback por voz em portugues para facilitar o uso","gerenciamento total via app pado digital locking disponivel para ios e android com suporte para wi fi e bluetooth","impressao digital","inteligente","lock","pado","portas de abrir","reconhecimento facial","reconhecimento facial ate 50 faces senhas numericas ate 250 registros cartoes rfid ate 1000 registros leitura biometrica ate 100 impressoes digitais e chave mecanica","reconhecimento facial biometria senha cartao rfid aplicativo e chave mecanica","residencial e comercial","rosto","sem macaneta ou puxador","smart lock","smartlock","vision"]},{"id":"paris-virtus-lock","terms":["abertura via aplicativo com envio de codigos de acesso temporarios para visitantes","aplicativo tuya com suporte em portugues","automatica","bateria de litio","biometria","biometrica","biometrico","com","dedo","deve estar entre 35mm a 120mm","digital","eletronica","eletronico","embutir","entrada micro usb","face","facial","facial capacidade de ate 100 registros armazena ate 50 digitais 200 senhas e 200 cartoes rfid mini","facial wi fi bluetooth biometria cartao rfid senha e chave mecanica","fecha dura","fechadra","fechadua","fechadura","fechadura digital com facial paris","fechadura digital com reconhecimento facial","fechaduras","gera relatorios detalhados de abertura diretamente no aplicativo","impressao digital","inteligente","lock","madeira e metal","mecanica robusta e compativel com abertura direita ou esquerda","paris","permite facil programacao e monitoramento disponivel para ios e android","portas de abrir","profissional","reconhecimento facial","reconhecimento facial biometria wi fi bluetooth cartao rfid senha e chave mecanica","residencial comercial e corporativa","rosto","smart lock","smartlock","touchscreen iluminado","virtus lock"]},{"id":"fde-101-plus-pado","terms":["1 ano","101","4 pilhas aa","55 mm","biometria","biometria ate 196 digitais cadastradas e senha unica de 3 a 15 digitos e aplicaitivo","biometria e senha digital","biometrica","biometrico","com","de embutir","dedo","digital","digital locking","eletronica","eletronico","embutida","embutir","fde","fecha dura","fechadra","fechadua","fechadura","fechadura digital de embutir","fechadura digital de embutir fde 101 plus com pado hub","fechaduras","fechamento suave e silencioso","hub","impressao digital","inteligente","leitor biometrico e painel digital de senha","lock","maquina vertical","pado","plus","portas com espessura de 30mm a 120mm","portas de abrir","rolete magnetico","smart lock","smartlock"]},{"id":"d120-imab","terms":["4 pilhas aa","acabamento moderno que combina com diversos estilos de decoracao","acesso por biometria digital teclado numerico senha tag cartao de proximidade e chave mecanica para emergencias","ate 100 digitais 100 senhas e 100 tags","automatico","biometria","biometria senha tag rfid e chave mecanica","biometrica","biometrico","compativel com portas de madeira de 35 a 55 mm de espessura","d120","dedo","design moderno e multiplos metodos de acesso","digital","eletronica","eletronico","embutir","entrada usb","facil instalacao","fecha dura","fechadra","fechadua","fechadura","fechadura digital","fechadura digital rolete d120","fechaduras","funciona com 4 pilhas aa com aviso sonoro de bateria fraca e entrada usb para alimentacao de emergencia","imab","impressao digital","indicada para areas protegidas de sol e chuva","inteligente","lock","madeira de 35 a 55 mm","portas de abrir","residencial comercial e corporativa","rolete","sistema de travamento automatico ao fechar a porta garantindo seguranca mesmo em momentos de descuido","smart lock","smartlock","suporta ate 100 digitais 100 senhas e 100 tags ideal para multiplos usuarios"]},{"id":"d220-imab","terms":["2 chaves mecanicas","35 a 60 mm de espessura","4 pilhas aa com autonomia de ate 12 meses","alarme antiviolacao","antipanico trava de seguranca e modo passagem","ate 200 usuarios digitais senhas e tags","biometria","biometria 360 senha tag rfid chave mecanica e aplicativo bluetooth","biometrica","biometrico","black","bluetooth com opcao de integracao wi fi via hub","compativel com o aplicativo ttlock ios e android","d220","de embutir d63","dedo","digital","eletronica","eletronico","embutir","estrutura robusta tecnologia avancada e design moderno","fecha dura","fechadra","fechadua","fechadura","fechadura digital","fechadura digital d220 unidade interna e externa","fechadura digital imab d220 preta","fechaduras","imab","impressao digital","instalacao simples em portas de madeira aluminio ou aco","inteligente","lock","manual e guia rapido","parafusos e acessorios de instalacao","portas de abrir","preta","preto","smart lock","smartlock","ttlock"]},{"id":"fdv-200-pado","terms":["1 conjunto fechadura","200","4 pilhas aa","4 pilhas aa de 1 5v","8 a 12 mm","ate 200 impressoes digitais","ate 800 senhas numericas","biometria","biometria e senha numerica","biometrica","biometrico","dedo","digital","digital locking","eletronica","eletronico","fdv","fecha dura","fechadra","fechadua","fechadura","fechadura digital pado porta de vidro fdv 200","fechadura eletrica digital biometrica para porta de vidro","fechaduras","impressao digital","inteligente","interna","lock","pado","porta","porta de giro porta de correr porta pivotante","porta de vidro","porta micro usb","porta micro usb para bateria de emergencia","portas de vidro","portugues pt br e ingles en us","sim","smart lock","smartlock","sobrepor","vidra","vidro"]},{"id":"m1602-papaiz","terms":["aco","armarios gaveteiros roupeiros e lockers metalicos","compacto e resistente","compativel com moveis e armarios de aco","digital","eletronica","eletronica por senha","eletronico","escritorios academias escolas vestiarios e ambientes corporativos","facil instalacao e operacao intuitiva","fecha dura","fechadra","fechadua","fechadura","fechadura eletronica para moveis de aco","fechadura eletronica para moveis de aco m1602 ca","fechaduras","ideal para uso coletivo ou individual","inteligente","lock","m1602","moveis","papaiz","para","perfeita para lockers armarios de vestiarios escritorios escolas e academias garantindo seguranca e controle de acesso eficiente com o padrao de qualidade papaiz","pilhas","por pilhas sem necessidade de fiacao","seguranca praticidade e alta durabilidade","sem fios e sem instalacoes complexas","senha numerica","smart lock","smartlock"]},{"id":"ppz-1002-papaiz","terms":["1002","4 pilhas aa nao inclusas","abertura com chave mecanica de seguranca","armarios gavetas lockers moveis de aco e mdf","aviso sonoro","cartao rfid","corpo em abs de alta resistencia e lingueta metalica","digital","eletronica","eletronico","facil instalacao sem necessidade de fiacao","fecha dura","fechadra","fechadua","fechadura","fechadura eletronica para moveis ppz 1002","fechaduras","ideal para ambientes corporativos academias escolas hospitais e residencias reduz custos com chaves e manutencao design discreto e moderno combinando com qualquer tipo de movel sistema autonomo e de baixo consumo de energia","inteligente","lock","moveis","papaiz","para","ppz","preto fosco com display digital touch","smart lock","smartlock"]},{"id":"ppz-1001-papaiz","terms":["1001","4 pilhas aa nao inclusas","armarios gavetas moveis de aco mdf ou lockers","armazena ate 50 digitais","biometria","biometrica","biometrico","chave mecanica de seguranca","corpo em abs de alta resistencia com lingueta metalica","dedo","digital","eletronica","eletronico","fecha dura","fechadra","fechadua","fechadura","fechadura eletronica para moveis biometrica ppz 1001","fechaduras","impressao digital","impressao digital biometria","inteligente","lock","moveis","papaiz","para","ppz","preto fosco com design moderno","seguranca biometrica acesso apenas com digitais cadastradas sem necessidade de chaves ou senhas ideal para uso compartilhado design discreto e elegante combinando com qualquer tipo de movel baixo consumo de energia e manutencao minima ideal para escritorios academias escolas hospitais e residencias","simples sem necessidade de fiacao","sinal sonoro e luminoso","smart lock","smartlock"]},{"id":"rolete-magnetico-60-pado","terms":["224 x 25 mm cantos retos","3 pinos rolantes","55 mm","60 mm","60mm","abnt nbr 14913","aco e componentes superdimensionados com tratamento anticorrosao individual","aco inox","alta resistencia fechamento suave e regulagem acessivel","ate 45 mm","duplo em aco sinterizado de padrao superior","euro","externa","fech zm rolete mag rq 201 55armc cel 60","fecha dura","fechadra","fechadua","fechadura","fechadura externa","fechadura rolete magnetico 3 pinos multiponto euro 60mm pado","fechaduras","latao niqueladas","lock","magnetico","mechanical","mola reforcada e sistema antidesgaste","monobloco em latao macico tecnologia tecnoponto","multiponto","pado","parafuso frontal com acesso mesmo apos a instalacao","pinos","portas de abrir","portas de abrir e portas pivotantes","portas de madeira ou metal","rolete","rolete com ajuste por parafuso frontal","zamack"]},{"id":"rolete-magnetico-100-pado","terms":["100 mm","100mm","224 x 25 mm cantos retos","3 pinos rolantes","55 mm","abnt nbr 14913","aco e componentes superdimensionados com tratamento anticorrosao individual","aco inox","alta resistencia fechamento suave e regulagem acessivel","ate 80 mm","duplo em aco sinterizado de padrao superior","euro","externa","fech zm rolete mag rq 201 55armc cel 60","fecha dura","fechadra","fechadua","fechadura","fechadura externa","fechadura rolete magnetico 3 pinos multiponto euro 100mm pado","fechaduras","latao niqueladas","lock","magnetico","mechanical","mola reforcada e sistema antidesgaste","monobloco em latao macico tecnologia tecnoponto","multiponto","pado","parafuso frontal com acesso mesmo apos a instalacao","pinos","portas de abrir","portas de abrir e portas pivotantes","portas de madeira ou metal","rolete","rolete com ajuste por parafuso frontal","zamack"]},{"id":"fechadura-externa-retro-maq55-pado","terms":["55 mm","compativel com a maioria das portas externas padrao","entrada","externa","externo","fecha dura","fechadra","fechadua","fechadura","fechadura externa","fechadura externa retro maq 55 pado","fechaduras","inclui todos os componentes necessarios para instalacao","liga metalica de alta resistencia","lock","maq","mechanical","pado","porta externa","portas de abrir","portas de entrada residenciais portas de estabelecimentos comerciais portas de acesso em condominios e predios","portas externas","premium residence","resistente a corrosao e desgaste adequado para uso externo","retro","rq2 583 55","seguranca reforcada resistencia durabilidade e design moderno","suave e silenciosa"]},{"id":"fechadura-luma-externa-roseta-redonda-pado","terms":["55 mm","abnt 14913","aco e latao","alta","cilindro resistente e mecanismo de fechamento seguro materiais de alta qualidade resistentes a corrosao e ao desgaste instalacao com ferramentas e acessorios necessarios","fecha dura","fechadra","fechadua","fechadura","fechadura externa","fechadura luma interna roseta redonda pado","fechaduras","grau 4","inox","interna","interno","lock","luma","luma externa roseta redonda","mechanical","pado","porta interna","portas de abrir","portas pivotantes ou de bater em madeira ou metal","quarto","redonda","roseta","trafego intenso"]},{"id":"fechadura-luma-banheiro-roseta-redonda-pado","terms":["55 mm","abnt 14913","aco e latao","alta","banheiro","cilindro resistente e mecanismo de fechamento seguro materiais de alta qualidade resistentes a corrosao e ao desgaste instalacao com ferramentas e acessorios necessarios","fecha dura","fechadra","fechadua","fechadura","fechadura externa","fechadura luma banheiro roseta redonda pado","fechaduras","grau 4","inox","lavabo","lock","luma","luma externa roseta redonda","mechanical","pado","portas pivotantes ou de bater em madeira ou metal","redonda","roseta","trafego intenso","wc"]},{"id":"fechadura-luma-externa-roseta-redonda-pado-2","terms":["55 mm","abnt 14913","aco e latao","alta","cilindro resistente e mecanismo de fechamento seguro materiais de alta qualidade resistentes a corrosao e ao desgaste instalacao com ferramentas e acessorios necessarios","entrada","externa","externo","fecha dura","fechadra","fechadua","fechadura","fechadura externa","fechadura luma externa roseta redonda pado","fechaduras","grau 4","inox","lock","luma","luma externa roseta redonda","mechanical","pado","porta externa","portas de abrir","portas pivotantes ou de bater em madeira ou metal","redonda","roseta","trafego intenso"]},{"id":"fechadura-interna-pado-concept-407-cromado-canto-redondo-40mm","terms":["10 anos","40 mm","407","40mm","5 5 cm","canto","concept","concept 407","cromado","externa","fecha dura","fechadra","fechadua","fechadura","fechadura externa","fechadura interna pado concept 407 cromado canto redondo 40mm","fechaduras","interna","interno","lock","mechanical","media","pado","porta interna","portas de abrir","puxador tubular","quarto","redondo","tubo","tubular","zamack"]},{"id":"duna-3-imab","terms":["10 anos","40mm","banheiro","botao de trava interno e pino de emergencia externo para destravar a porta em caso de necessidade","design inteligente e recursos de instalacao simples para instalacao rapida em uma variedade de portas de banheiro","design moderno e acabamento refinado","duna","duna3ext","fabricada com materiais resistentes e duraveis com acabamento especial contra corrosao e desgaste","fecha dura","fechadra","fechadua","fechadura","fechadura banheiro duna 3 maq 40 imab","fechaduras","imab","lavabo","lock","maq","mechanical","media","portas de abrir","privacidade garantida seguranca e confiabilidade estilo e elegancia mecanismo suave e design ergonomico","projetada especialmente para portas de banheiro oferecendo privacidade e seguranca","wc","zamack"]},{"id":"dobradica-4x3-canto-reto-inox-rolamento-dss","terms":["4 x 3 polegadas","7 5 cm de largura x 10 0 cm de altura","aco","aco inox","aco inoxidavel","canto","canto reto","com","com rolamento","designer fechaduras","dobradica","dobradica 4 x 3 canto reto em aco inox com rolamento dss","dobradica 4 x 3 com canto reto e rolamento","dobradica de inox","dobradicas","dobradisa","dobradissa","dss","hinge","hinges","inox","inoxidavel","maior resistencia durabilidade e operacao silenciosa","portas de madeira ou metalicas","portas residenciais e comerciais","reto","rolamento"]},{"id":"kit-3-dobradicas-3-5x3-inox-dss","terms":["1 2 cm","2 5 mm","3 12 x 3 polegadas","7 6 cm","8 7 cm","aco","aco inox","aco inoxidavel","acompanha 6 parafusos de inox para cada dobradica","alta resistencia durabilidade deslizamento suave e operacao silenciosa","ate 60 kg por conjunto com 3 pecas","ate 60 kg por jogo com 3 pecas","canto reto","com rolamento","designer fechaduras","dobradica","dobradica 3 12 x 3 c reto aco inox dss","dobradica de inox","dobradicas","dobradisa","dobradissa","dss","hinge","hinges","inox","inox 304","inoxidavel","kit com 3 dobradicas 3 12 x 3 com canto reto e rolamento","pino de rolamento que nao sai","portas residenciais e comerciais","reto","rolamento blindado para deslizamento suave","zero manutencao"]},{"id":"dobradicas-3x2-5-canto-reto-inox-dss","terms":["1 cm","2 mm","212","3 x 212 polegadas","6 4 cm","7 5 cm","aco","aco inox","aco inox 304","acompanha 6 parafusos de inox para cada dobradica","alta resistencia a corrosao e alta durabilidade","ate 40 kg cada conjunto com 3 pecas","canto reto","designer fechaduras","dobradica","dobradica 3 x 212 com canto reto e rolamento","dobradica de inox","dobradicas","dobradicas 3 x 212 c reto aco inox dss","dobradisa","dobradissa","dss","hinge","hinges","inox","inox 304","inoxidavel","pino com rolamento","pino com rolamento pino nao sai","pino com rolamento que nao sai deslizamento suave e zero manutencao","reto","rolamento blindado para deslizamento suave sem atrito e com abertura e fechamento silenciosos","zero manutencao"]},{"id":"dobradica-3x2-5-canto-redondo-inox-dss","terms":["1 cm","2 mm","212","3 x 212 polegadas","6 4 cm","7 5 cm","aco","aco inox","aco inox 304","acompanha 6 parafusos de inox para cada dobradica","alta resistencia a corrosao e alta durabilidade","ate 40 kg cada conjunto com 3 pecas","canto redondo","designer fechaduras","dobradica","dobradica 3 x 212 c redondo aco inox dss","dobradica 3 x 212 com canto redondo e rolamento","dobradica de inox","dobradicas","dobradisa","dobradissa","dss","hinge","hinges","inox","inox 304","inoxidavel","pino com rolamento","pino com rolamento pino nao sai","pino com rolamento que nao sai deslizamento suave e zero manutencao","puxador tubular","redondo","rolamento blindado para deslizamento suave sem atrito e com abertura e fechamento silenciosos","tubo","tubular","zero manutencao"]},{"id":"dobradica-3-5x3-canto-redondo-inox-dss","terms":["1 2 cm","2 5 mm","3 12 x 3 polegadas","7 6 cm","8 7 cm","aco","aco inox","aco inox 304","acompanha 6 parafusos de inox para cada dobradica","alta resistencia a corrosao e alta durabilidade","ate 60 kg por jogo com 3 pecas","canto redondo","designer fechaduras","dobradica","dobradica 3 12 x 3 c redondo aco inox dss","dobradica 3 12 x 3 com canto redondo e rolamento","dobradica de inox","dobradicas","dobradisa","dobradissa","dss","hinge","hinges","inox","inox 304","inoxidavel","pino com rolamento que nao sai deslizamento suave operacao silenciosa e zero manutencao","pino de rolamento que nao sai","puxador tubular","redondo","rolamento blindado","rolamento blindado para deslizamento suave sem atrito e com abertura e fechamento silenciosos","tubo","tubular","zero manutencao"]},{"id":"dobradica-3-5x3-canto-reto-carbono-dss","terms":["2 mm de espessura aproximado","3 1 2 x 3","aco","aco carbono","canto reto","capa cromado capa antique capa preto fosco","carbono","chato fp reforcada","designer fechaduras","dobradica","dobradica 3 12 x 3 c reto aco carbono","dobradica 3 12 x 3 c reto aco carbono sem rolamento dss","dobradica de aco carbono","dobradicas","dobradisa","dobradissa","dss","hinge","hinges","portas de madeira ferro ou aluminio","residencial comercial ou industrial","reto","rolamento","sem","sem rolamento dss","suporte reforcado para portas pesadas alta durabilidade e resistencia a corrosao movimentacao suave e silenciosa acabamento de excelente qualidade"]},{"id":"dobradica-3x2-5-canto-reto-carbono-dss","terms":["212","3 5 x 2 5 polegadas","3 x 212","6 5 cm x 7 6 cm","aco","aco carbono","aco de alta qualidade aco carbono","canto reto","cantos retos","cantos retos facilitam o alinhamento e a instalacao","carbono","cromado antique e preto fosco","designer fechaduras","dobradica","dobradica 3 x 212 c reto aco carbono sem rolamento dss","dobradica 3 x 212 com canto reto","dobradica de aco carbono","dobradicas","dobradisa","dobradissa","dss","hinge","hinges","portas de madeira mdf ou outros materiais compativeis","portas de trafego moderado","resistencia a corrosao e ao desgaste","reto","rolamento","sem","sem rolamento dss"]},{"id":"dobradica-4x2-5-sobrepor-inox-dss","terms":["1 1 cm","10 cm","2 5 mm","4 cm","4 x 2 12","aco inox","acompanha 8 parafusos de inox para cada dobradica","alta resistencia a corrosao e alta durabilidade","ate 40 kg por jogo com 3 pecas","de sobrepor","designer fechaduras","dobradica","dobradica de sobrepor","dobradica de sobrepor 4 x 2 12 inox dss","dobradicas","dobradisa","dobradissa","dss","hinge","hinges","inox","inox 304","inoxidavel","pino com rolamento que nao sai deslizamento suave abertura e fechamento silenciosos e zero manutencao","pino de rolamento que nao sai","rolamento blindado","rolamento blindado para deslizamento suave sem atrito e com abertura e fechamento silenciosos","sobrepor","sobrepor de inox","sobreposta","zero manutencao"]},{"id":"dobradica-3-5x2-5-sobrepor-carbono-dss","terms":["212","3 1 2 x 2 1 2","312","aco","aco carbono","ate 30 kg por jogo 3 dobradicas","carbono","cromado antique e preto fosco","de sobrepor","designer fechaduras","dobradica","dobradica de sobrepor 312 x 212 aco carbono dss","dobradica de sobrepor com rolamento","dobradicas","dobradisa","dobradissa","dss","ferro da mais alta qualidade","hinge","hinges","portas e janelas de madeira","sim","sobrepor","sobrepor de aco carbono","sobreposta"]},{"id":"dobradica-3-5x3-canto-redondo-carbono-dss","terms":["1 cm","2 mm","3 12 x 3","7 6 cm","8 9 cm","aco","aco carbono","aco carbono com resistencia mecanica e alta durabilidade","acompanha 6 parafusos para cada dobradica","ate 60 kg cada conjunto com 3 pecas","ate 60 kg por conjunto com 3 pecas","baixa manutencao","canto redondo","carbono","cromado e preto fosco","designer fechaduras","diferentes aplicacoes","dobradica","dobradica 3 12 x 3 c redondo aco carbono dss","dobradica 3 12 x 3 com canto redondo","dobradica de aco carbono","dobradicas","dobradisa","dobradissa","dss","hinge","hinges","movimento preciso e confiavel conforme ficha tecnica","pino que nao sai","pino sem rolamento pino nao sai","puxador tubular","redondo","sem rolamento dss","tubo","tubular"]},{"id":"dobradica-3x2-5-canto-redondo-carbono-dss","terms":["1 cm","2 mm","212","3 x 2 1 2","6 5 cm","7 6 cm","aco","aco carbono","aco inox","acompanha 6 parafusos para cada dobradica","ate 40kg cada conjunto com 3 pecas","canto redondo","carbono","com capacidade de suportar ate 60kg modelo 3 1 2 x 3 e 40kg modelo 3 x 2 1 2 por jogo com 3 pecas voce pode confiar na resistencia e estabilidade oferecidas por nossas dobradicas","com um pino que nao sai sua porta permanece segura e estavel em todos os momentos sua tranquilidade e nossa prioridade","designer fechaduras","dobradica","dobradica 3 x 212 c redondo aco carbono inox dss","dobradica 3 x 212 com canto redondo","dobradica de aco carbono","dobradicas","dobradisa","dobradissa","dss","gracas ao seu sistema sem rolamento a dobradica proporciona um movimento preciso e confiavel garantindo uma abertura e fechamento adequados da porta","hinge","hinges","inox","inoxidavel","nossa dobradica e fabricada em aco carbono um material conhecido por sua excelente resistencia mecanica e alta durabilidade essa e a garantia de que sua dobradica oferece resistencia e estabilidade para diferentes aplicacoes","pino sem rolamento pino nao sai seguranca","preto fosco e polida","projetada para oferecer praticidade e durabilidade nossa dobradica proporciona excelente desempenho no uso diario reduzindo a necessidade de ajustes frequentes","puxador tubular","qualidade inigualavel","redondo","sem rolamento dss","tubo","tubular"]},{"id":"cadeado-papaiz-cr20","terms":["2 chaves de latao niquelado","20 mm aprox","20mm","accessories","aco cementado e cromado","armarios malas mochilas caixas de correio vestiarios e itens de uso diario","cadeado","cadeado com chave","cadeado papaiz pequeno cr 20mm latao macico 2 chaves cor dourado 20mm","cadeados","chaves","compacto e leve estrutura robusta e resistente a corrosao acompanha chaves sobressalentes marca reconhecida nacionalmente em seguranca","cor","cr20","dourado","latao","latao dourado","latao macico","macico","padlock","padrao leve linha standard","papaiz","pequeno","proteger objetos de pequeno a medio porte como armarios bolsas mochilas caixas baus e outros pertences em casa escola ou trabalho"]},{"id":"cadeado-color-line-papaiz-cr40-amarelo","terms":["2 chaves em latao niquelado com capa plastica na mesma cor do cadeado","20 mm 25 mm 30 mm e 40 mm","40 mm","accessories","aco inox","aco inox maior resistencia contra acao da maresia","amarelo","cadeado","cadeado color line papaiz cr40 amarelo","cadeado com chave","cadeados","color","color line","cr40","duas chaves em latao niquelado com capa plastica na mesma cor do cadeado","dupla trava","dupla trava provendo maior seguranca","latao macico","latao macico envolvido por capa termoplastica","latao macico envolvido por uma capa termoplastica","line","padlock","papaiz"]},{"id":"amortecedor-porta-300-imab","terms":["0300 zmk","26 5 mm","30 mm","300","accessories","amortecedor","amortecedor de porta","amortecedor para porta","amortecedor para porta 300 imab","amortecedor para portas com batente de borracha e fixacao no piso","amortecedores","batente amortecedor porta zamak 0300 cromado","borracha","bucha e parafuso que acompanham o item","cromado escovado e antique a capa do produto tambem apresenta a opcao preto fosco","cromado escovado preto fosco e antique","evitar que a porta danifique a parede ou atuar como limitador de abertura","imab","no piso com bucha e parafuso","para","porta","portas","preciso e silencioso","zamak"]},{"id":"cremona-lisa-uniao-mundial","terms":["01 fecho de sobrepor 16 parafusos para a instalacao 4 presilhas para vara 2 testas de acabamento fixacao da vara","1 ano","250g","accessories","acompanha parafusos de instalacao","c 108 mm x l 32 mm x a 12 mm","c 53 mm x l 35 mm x a 50 mm espessura 5 mm","cremona","cremona lisa mil sobrepor para porta de correr e janela","cremona lisa uniao mundial","cromado escovado antique e preto fosco","fecho portas e janelas","ferrolho trinco","lisa","manopla cremona","mundial","trinco cremona","uniao","uniao mundial","zamac"]},{"id":"fecho-batom-uniao-mundial","terms":["04 parafusos de fixacao 01 contra testa 01 trinco batom","1 ano","66 mm 22 mm 46 mm 21 mm 14 20 mm 12 mm 3 20 mm 37 mm","accessories","batom","cromado escovado antique e preto fosco","fechador","fecho","fecho batom uniao mundial","fechos","ferrolho","latao e zamac","mundial","portas e janelas de madeira portas de armarios com espessura minima de 25 mm","trava","trinco","trinco batom","uniao","uniao mundial"]},{"id":"mola-de-piso-ud75v-assa-abloy","terms":["1 100 mm","1 4","1 ano","120 kg","180 20","20 0","275 x 82 5 x 51 mm","3 2 kg","90","a direita ou a esquerda","abloy","accessories","ajustavel na valvula","alta umidade e intemperies","assa","assa abloy","fechador de porta","inox","inox inx","intenso","mola","mola aerea","mola de piso ud75v assa abloy","molas","piso","sim","tipo t santa marina","ud75v"]},{"id":"mola-de-piso-ud65-assa-abloy","terms":["1 ano","100 kg","116 20","20 0","270 x 113 x 51 mm","3 2 kg","90","950 mm","a direita ou a esquerda","abloy","accessories","ajustavel na valvula","alta umidade e intemperies","assa","assa abloy","fechador de porta","inox","inox inx","intenso","mola","mola aerea","mola de piso ud65 assa abloy","molas","piso","sim","tipo t santa marina","ud65"]},{"id":"ferrolho-de-sobrepor","terms":["6 cm 9 cm 12 cm 15 cm 20 cm 30 cm 50 cm 70 cm 80 cm","6 cm 9 cm 12 cm 15 cm 20 cm 30 cm 50 cm 70 cm e 80 cm","accessories","cromado escovado antique e preto fosco","de sobrepor","fechador","fecho","ferrolho","ferrolho de sobrepor","ferrolho trinco","olho da porta","olho magico","portas e janelas","sobrepor","sobreposta","trava","trinco","uniao mundial","visor","visor de porta","visor porta","zamac"]},{"id":"mola-aerea-ud77z-assa-abloy","terms":["1 ano","2 3 4","40 kg 60 kg 80 kg","850 mm 950 mm 1 100 mm","abloy","accessories","aerea","ajustavel","ajustavel no braco","assa","assa abloy","fecha a porta suavemente e sem ruidos mantem a porta fechada elimina correntes de ar isolamento de ambientes economia de energia reduz a propagacao de ruidos e odores possibilita reducao da propagacao de fumaca e retarda a propagacao de fogo evita acidentes","fechador de porta","mola","mola aerea","mola aerea ud77z assa abloy","molas","nao especificado no material enviado","ud77z"]},{"id":"mola-aerea-ud45-assa-abloy","terms":["1 kg","135","135 15","15 0","45 kg","850 mm","a direita ou a esquerda","abloy","accessories","aerea","alta","assa","assa abloy","fechador de porta","leve","mola","mola aerea","mola aerea ud45 assa abloy","molas","nao","ud45"]},{"id":"mola-aerea-dss-assa-abloy","terms":["accessories","aerea","disponivel sob consulta","dss","fechador de porta","mola","mola aerea","mola aerea dss","molas","portas de 25 a 45 kg","portas de 25 a 80 kg","preto prata e branco","regulavel 2 4"]},{"id":"pivo-em-inox-com-esfera-para-portas-dss","terms":["14 9 cm x 2 7 cm x 09 mm","150 kg 350 kg 600 kg e 1000 kg","350 kg","accessories","aco inox","com","dss","esfera","inox","inox 304","inoxidavel","minimo 3 2 cm e maximo 8 cm","para","pivo","pivo de porta","pivo em inox com esfera para portas dss","pivos","pivotante","portas"]},{"id":"pivo-inox-ajustavel-200kg-dss","terms":["200kg","accessories","acessorio de suporte pesado","aco inox","aco inoxidavel","ajustavel","ate 200 kg","dss","inox","inoxidavel","pino pivotante inox ajustavel","pivo","pivo de porta","pivo inox ajustavel 200kg dss","pivos","pivotante","portas de madeira e aluminio"]},{"id":"fecho-livre-ocupado-3f","terms":["3f","accessories","aco inox na caixa espelho e castanha zamac no visor lingueta e botao","aco inox zamac","adaptacao a diferentes espessuras de porta kit de parafusos incluso","banheiros escritorios escolas rodoviarias aeroportos e pracas","conforme desenho tecnico","cromado e preto fosco","fechador","fecho","fecho livre ocupado 3f","fechos","ferrolho","livre","ocupado","portas de diferentes espessuras","trava","trinco"]},{"id":"prendedor-para-porta-804-adesivo-imab","terms":["55 mm de altura 46 mm x 34 mm na base ima 30 mm espessura 5 5 mm","55 mm de altura base 46 mm x 34 mm ima 30 mm espessura 5 5 mm","804","804 adesivo","accessories","adesiva pode ser usado no piso ou na parede","adesivo","batedor","batente de porta","biometria","biometrica","biometrico","cromado escovado antique e preto fosco","dedo","digital","imab","impressao digital","para","porta","prendedor","prendedor para porta 804 adesivo imab","prendedores","stopper","zamak"]},{"id":"prendedores-magneticos-0804-zmk-dss","terms":["0 25 cm","0804","0804 zmk","1 9 cm","2 5 cm","6 cm","6 cm de diametro 6 cm de comprimento 2 5 cm de profundidade 1 9 cm de altura 0 25 cm de espessura","accessories","adesiva","batedor","batente de porta","biometria","biometrica","biometrico","cromado escovado e preto fosco","dedo","digital","dss","impressao digital","magneticos","piso ou parede","prendedor","prendedores","prendedores magneticos 0804 zmk dss","stopper","zamak","zmk"]},{"id":"veda-frestas-6m-adesivo","terms":["1 rolo duplo de borracha autoadesiva com 3 metros de comprimento 6 m apos sua divisao","1 um ano contra defeitos de fabricacao de acordo com os termos de garantia","2 mm e 6 mm","2x9 mm pequeno e 6x9 mm grande","6 metros apos a divisao do rolo duplo","6 mm","9 mm","accessories","adesivo","batentes de portas janelas esquadrias e armarios","borracha epdm","frestas","metros","preto marrom e branco","qualquer modelo de porta e janela","sem restricao","veda","veda frestas","veda frestas 6 metros adesivo","veda porta","vedacao"]},{"id":"borracha-batente-portas-madeira","terms":["a 9 0 mm b 3 9 mm","accessories","batente","borracha","borracha batente de encaixe","borracha batente de encaixe para porta e janela de madeira","borracha batente para portas de madeira","contra vento poeira e insetos","encaixe simples sem uso de cola","facil de instalar","madeira","material flexivel e duravel","para","portas","portas e janelas de madeira","preto cinza marrom bege e branco","produto vendido por metro e cortado conforme medida solicitada","protecao contra vento poeira e insetos","reducao de ruidos e impactos no fechamento","reduz ruidos e impactos no fechamento","vedacao"]},{"id":"fita-veda-frestas-escova-adesivo","terms":["10 mm","10 mm de altura 7 mm de base","7 mm","accessories","adesivo","amortecimento de impacto","autoadesiva sem necessidade de auxilio profissional","auxilia no isolamento acustico e termico","contra insetos poeira umidade agua e ventos","escova","fibra sintetica com base autoadesiva","fita","fita veda frestas escova adesivo portas e janelas","fita veda frestas escova autoadesiva","frestas","janelas","portas","portas janelas armarios esquadrias portoes e gavetas","retirar o papel protetor do adesivo e aplicar na superficie desejada","superficies limpas secas e sem poeira ou umidade","veda","veda frestas","veda porta","vedacao"]},{"id":"veda-porta-embutir","terms":["1 ano","100 000 ciclos","26 db","34 mm de altura 14 mm de largura","accessories","ate 15 cm no comprimento","de embutir","embutida","embutir","espessura maxima de 1 5 cm","isolamento acustico realizado no brasil pelo ipt de acordo com as normas da abnt","madeira metal e pvc dobradicas ou pivotantes","medidas de 62 a 152 cm","porta","portas de madeira aluminio ferro e pvc","veda","veda frestas","veda porta","veda porta automatico de embutir","veda porta de embutir","vedacao"]},{"id":"guia-l-porta-correr","terms":["51 mm de altura 33 mm de comprimento 3 mm de espessura","9 mm","accessories","aluminio","correr","deslizante","guia","guia de porta","guia l para porta de correr","guia porta","para","para canaleta tipo u serve como guia","porta","porta correr","porta de correr","portas de correr"]},{"id":"guia-reto-9mm-porta-correr","terms":["9mm","accessories","aluminio nylon","correr","deslizante","guia","guia de porta","guia porta","guia reto","guia reto para porta de correr","guias","interno externo","natural","para","porta","porta correr","porta de correr","portas de correr em madeira","reto"]},{"id":"guia-tipo-canoa-aluminio-15cm","terms":["1 2 cm","1 cm","15 cm","15cm","accessories","aluminio","canoa","correr","deslizante","guia","guia de porta","guia porta","guia tipo canoa de aluminio 15cm p porta de correr","natural","porta","porta correr","porta de correr","portas de correr de madeira","tipo"]},{"id":"fecho-unha-embutir-uniao-mundial","terms":["12 cm","13 5 cm","2 5 cm","2 cm","accessories","de embutir","embutida","embutido na lateral da porta ou janela","embutir","fechador","fecho","fecho unha de embutir uniao mundial","fechos","ferrolho","latao","mundial","portas e janelas","trava","trinco","unha","uniao","uniao mundial","zamak"]},{"id":"olho-magico-60mm-visao-200-timmer","terms":["1 ano","20 mm","200","28 mm","60mm","60mm visao 200","accessories","furacao na porta com furadeira","latao","liga de zinco","magico","olho","olho da porta","olho magico","olho magico 60mm visao 200 timmer","olho magico de porta","portas de apartamentos condominios e casas","timmer","visao","visor","visor de porta","visor porta"]},{"id":"olho-magico-42mm-visao-200-timmer","terms":["1 ano","20 mm","200","28 mm","42mm","42mm visao 200","accessories","furacao na porta com furadeira","latao","liga de zinco","magico","olho","olho da porta","olho magico","olho magico 42mm visao 200 timmer","olho magico de porta","portas de apartamentos condominios e casas","timmer","visao","visor","visor de porta","visor porta"]},{"id":"olho-magico-digital-iviewer-01-hdv-s2-imab","terms":["4 3 polegadas","accessories","alta definicao","biometria","biometrica","biometrico","dedo","digital","eletronica","eletronico","hd","hdv","imab","impressao digital","infravermelho","inteligente","iviewer","iviewer 01 hdv s2","lcd colorida de 4 3 polegadas","lcd colorido","magico","olho","olho da porta","olho magico","olho magico de porta","olho magico digital iviewer 01 hdv s2 imab","pressionar um botao para ativar o visor e visualizar a imagem em tempo real","sim","smart lock","smartlock","visor","visor de porta","visor porta"]},{"id":"par-roldanas-concavas-fermax-duas-rodas","terms":["2 roldanas","80kg para 2 rodas","accessories","blindado","com","concavas","duas","fermax","materiais de alta qualidade","par","par de roldanas concavas 2 rodas","par de roldanas concavas com rolamento blindado duas rodas","porta de correr","portas de correr portoes e sistemas deslizantes","recomenda se a instalacao por um profissional","residencial comercial e industrial","rodas","rodinha","rodizio","rolamento","roldana","roldanas","somente em trilhos concavos","um kit para cada folha da porta de correr"]},{"id":"par-roldanas-concavas-rolamento-blindado","terms":["2 roldanas","80kg para 2 rodas","accessories","blindado","com","concavas","duas","materiais de alta qualidade","par","par de roldanas concavas 2 rodas","par de roldanas concavas com rolamento blindado duas rodas","perfil","porta de correr","portas de correr portoes e sistemas deslizantes","recomenda se a instalacao por um profissional","residencial comercial e industrial","rodas","rodinha","rodizio","rolamento","roldana","roldanas","somente em trilhos concavos","um kit para cada folha da porta de correr"]},{"id":"par-roldanas-concavas-rolamento-blindado-4-rodas","terms":["4 roldanas","80kg para 4 rodas","accessories","blindado","com","concavas","materiais de alta qualidade","par","par de roldanas concavas 4 rodas","par de roldanas concavas com rolamento blindado quatro rodas","perfil","porta de correr","portas de correr portoes e sistemas deslizantes","quatro","recomenda se a instalacao por um profissional","residencial comercial e industrial","rodas","rodinha","rodizio","rolamento","roldana","roldanas","somente em trilhos concavos","um kit para cada folha da porta de correr"]},{"id":"trilho-2mt-aluminio-reto-porta-de-correr","terms":["12 mm","2 metros","2000 mm","22 mm","2mt","38 mm 38 mm","accessories","aluminio","aluminio de alta qualidade","ambientes residenciais comerciais e industriais","correr","deslizante","natural e bronze","para","porta","porta correr","porta de correr","portas de correr","rail","recomenda se a instalacao por profissional qualificado","reto","sistemas de roldanas retas","trilho","trilho 2mt de aluminio reto para porta de correr","trilho de porta"]},{"id":"canaleta-1mt-aluminio-u-porta-de-correr","terms":["1 metro","1000 mm","13 mm 13 mm","1mt","accessories","aluminio","aluminio de alta durabilidade","ambientes residenciais comerciais e industriais","canaleta","canaleta 1mt de aluminio em u para porta de correr","canaleta u","correr","deslizante","para","porta","porta correr","porta de correr","portas de correr","portas de madeira vidro ou metal que utilizam sistemas deslizantes","recomenda se a instalacao por profissional especializado"]},{"id":"puxador-concha-22cm","terms":["1 cm","10 mm","185 mm","22 cm","220 mm","22cm","28 mm","5 4 cm","55 mm","8 mm 20 mm","aco inox 304","alca","concha","dss","handle","handles","portas de correr","puchador","puxador","puxador concha","puxador concha 22 cm","puxadores","recomenda se a contratacao de profissional"]},{"id":"fechadura-retro-blim-blim-externa","terms":["2 5 cm","29 cm","5 4 cm","6 0 cm","6 2 cm","6 8 cm","7 2 cm","7 8 cm","areas de entrada residenciais e comerciais","blim","chave mecanica","designer fechaduras","deve ser realizada por profissional qualificado","entrada","externa","externo","fecha dura","fechadra","fechadua","fechadura","fechadura externa retro blim blim","fechadura retro blim blim externa","fechaduras","lock","materiais de alta qualidade","mechanical","porta externa","portas de abrir","portas de madeira ou metal com ou sem batente","portas externas","residencial e comercial","retro","retro vintage"]},{"id":"fechadura-imab-bine-externa-inox","terms":["135 mm","1750 1851 1952","55 mm","60 mm","aco inox","bine","bine maq 55","chave mecanica","entrada","externa","externo","fecha dura","fechadra","fechadua","fechadura","fechadura imab bine externa inox","fechaduras","imab","inox","inoxidavel","lock","mechanical","polido preto fosco e escovado","porta externa","portas de abrir"]},{"id":"fechadura-imab-bine-interna-inox","terms":["135 mm","60 mm","aco inox","bine","chave mecanica","fecha dura","fechadra","fechadua","fechadura","fechadura imab bine interna inox","fechaduras","imab","inox","inoxidavel","interna","interno","lock","mechanical","polido preto fosco e escovado","porta interna","portas de abrir","quarto"]},{"id":"fechadura-hato-2-externa-inox-55mm-imab","terms":["1750","55 mm","55mm","91","aco inox","alta","cjc991e17xp00","conjunto de fechadura da linha premium do modelo hato 2 c991 material aco inox no acabamento pp preto composto de roseta 091 fechadura 1750 com distancia da broca de 55 mm","entrada","externa","externo","fec hato 2 nx m09c9 r0091 ez1750 pp","fecha dura","fechadra","fechadua","fechadura","fechadura hato 2 externa inox 55mm imab","fechaduras","hato","hato 2 c991","imab","inox","inoxidavel","lock","mechanical","polido escovado e preto fosco","porta externa","portas de abrir"]},{"id":"fechadura-hato-2-banheiro-inox-55mm-imab","terms":["1952","55 mm","55mm","91","aco inox","banheiro","cjc991b19pp00","conjunto de fechadura da linha premium do modelo hato 2 c991 material aco inox no acabamento pp inox preto composto de roseta 091 fechadura 1750 com distancia da broca de 55 mm","fec hato 2 nx m09c9 r0091 bz1952 pp","fecha dura","fechadra","fechadua","fechadura","fechadura hato 2 banheiro inox 55mm imab","fechaduras","hato","hato 2 c991","imab","inox","inoxidavel","lavabo","lock","mechanical","media","portas de abrir","preto polido escovado","tranqueta","wc"]},{"id":"fechadura-hato-2-interna-inox-55mm-imab","terms":["1 2 kg","19 5 cm","2 2 cm","3 cm","4 cm","55 mm","55mm","aco","aco inox","basculante","fecha dura","fechadra","fechadua","fechadura","fechadura hato 2 interna inox 55mm imab","fechaduras","hato","hato 2 quadrada inox","imab","inox","inoxidavel","interna","interno","lock","mechanical","parafusos","polido preto fosco e escovado","porta de madeira","porta interna","portas de abrir","quarto","retangular","sim","unidirecional"]},{"id":"fechadura-imab-bine-banheiro-inox","terms":["135 mm","55 mm","60 mm","aco inox","banheiro","bine","chave mecanica","fecha dura","fechadra","fechadua","fechadura","fechadura imab bine banheiro inox","fechaduras","imab","inox","inoxidavel","lavabo","lock","mechanical","polido preto fosco e escovado","portas de abrir","wc"]},{"id":"fechadura-florenca-externa-55mm-silvana","terms":["25 a 35 mm","25 a 35 mm de espessura","55 mm","55mm","60 mm em zamac","aco inox","aco inox 304","aco inox polido e escovado","entrada","externa","externo","fecha dura","fechadra","fechadua","fechadura","fechadura florenca porta externa 55mm inox silvana","fechaduras","florenca","inox","inoxidavel","intenso","lock","maximo","mechanical","nivel 3","porta","porta externa","portas de abrir","premium 5500 florenca","silvana","silvana assa abloy"]},{"id":"fechadura-florenca-interna-55mm-silvana","terms":["25 a 35 mm","25 a 35 mm de espessura","55 mm","55mm","60 mm em zamac","aco inox","aco inox 304","aco inox polido e escovado","fecha dura","fechadra","fechadua","fechadura","fechadura florenca porta interna 55mm inox silvana","fechaduras","florenca","inox","inoxidavel","intenso","interna","interno","lock","maximo","mechanical","nivel 3","porta","porta interna","portas de abrir","premium 5500 florenca","quarto","silvana","silvana assa abloy"]},{"id":"fechadura-florenca-banheiro-55mm-silvana","terms":["25 a 35 mm","25 a 35 mm de espessura","55 mm","55mm","60 mm em zamac","aco inox","aco inox 304","aco inox polido e escovado","banheiro","fecha dura","fechadra","fechadua","fechadura","fechadura florenca porta banheiro 55mm inox silvana","fechaduras","florenca","inox","inoxidavel","intenso","lavabo","lock","maximo","mechanical","nivel 3","porta","premium 5500 florenca","silvana","silvana assa abloy","wc"]},{"id":"duna-1-imab","terms":["10 anos","1300","40 mm","69","cj8769e13cr00r","duna","duna 1 8769","entrada","externa","externo","fec duna m0987z r0069 er1300 cr c reto","fecha dura","fechadra","fechadua","fechadura","fechadura externa duna 1 imab","fechaduras","imab","lock","mechanical","polido preto fosco escovado e antique","porta externa","portas de abrir","superior","zamack","zamak"]},{"id":"duna-1-imab-interna","terms":["10 anos","1300","40 mm","69","cj8769e13cr00r","duna","duna 1 8769","fec duna m0987z r0069 er1300 cr c reto","fecha dura","fechadra","fechadua","fechadura","fechadura interna duna 1 imab","fechaduras","imab","interna","interno","lock","mechanical","polido preto fosco escovado e antique","porta interna","portas de abrir","quarto","superior","zamack","zamak"]},{"id":"duna-3-imab-externa","terms":["10 anos","40mm","design inteligente e recursos de instalacao simples para portas de abrir","design moderno e acabamento refinado","duna","duna3ext","entrada","externa","externo","fabricada com materiais resistentes e duraveis com acabamento contra corrosao e desgaste","fecha dura","fechadra","fechadua","fechadura","fechadura externa duna 3 maq 40 imab","fechaduras","imab","lock","maq","mechanical","media","porta externa","portas de abrir","projetada para portas externas oferecendo seguranca durabilidade e design moderno","seguranca e confiabilidade estilo e elegancia mecanismo suave e design ergonomico","zamack"]},{"id":"duna-3-imab-interna","terms":["10 anos","40mm","banheiro","botao de trava interno e pino de emergencia externo para destravar a porta em caso de necessidade","design inteligente e recursos de instalacao simples para instalacao rapida em uma variedade de portas de banheiro","design moderno e acabamento refinado","duna","duna3ext","fabricada com materiais resistentes e duraveis com acabamento especial contra corrosao e desgaste","fecha dura","fechadra","fechadua","fechadura","fechadura interna duna 3 maq 40 imab","fechaduras","imab","interna","interno","lock","maq","mechanical","media","porta interna","portas de abrir","privacidade garantida seguranca e confiabilidade estilo e elegancia mecanismo suave e design ergonomico","projetada especialmente para portas de banheiro oferecendo privacidade e seguranca","quarto","zamack"]},{"id":"fechadura-interna-retro-maq55-pado","terms":["cromado e escovado","fecha dura","fechadra","fechadua","fechadura","fechadura interna","fechadura interna retro maq 55 pado","fechaduras","interna","interno","lock","maq","mechanical","pado","porta interna","portas de abrir","quarto","retro","zamack"]},{"id":"duna-1-imab-banheiro","terms":["10 anos","1300","40 mm","69","banheiro","cj8769e13cr00r","duna","duna 1 8769","fec duna m0987z r0069 er1300 cr c reto","fecha dura","fechadra","fechadua","fechadura","fechadura banheiro duna 1 imab","fechaduras","imab","lavabo","lock","mechanical","polido preto fosco escovado e antique","portas de abrir","superior","wc","zamack","zamak"]},{"id":"fechadura-banheiro-retro-maq55-pado","terms":["55 mm","banheiro","botao de trava interno e pino de emergencia externo para destravar a porta em caso de necessidade","design moderno e acabamento refinado","fecha dura","fechadra","fechadua","fechadura","fechadura banheiro retro maq 55 pado","fechaduras","instalacao simples em portas de abrir","lavabo","lock","macaneta 118 mm 26 mm distancia indicada no desenho 39 mm","maq","materiais resistentes e duraveis com acabamento contra corrosao e desgaste","mechanical","pado","portas de abrir","projetada para portas de banheiro oferecendo privacidade e seguranca","retro","retro maq 55","wc","zamack"]},{"id":"fechadura-externa-pado-concept-407-cromado-canto-redondo-40mm","terms":["10 anos","40 mm","407","40mm","5 5 cm","canto","concept","concept 407","cromado","entrada","externa","externo","fecha dura","fechadra","fechadua","fechadura","fechadura externa","fechadura externa pado concept 407 cromado canto redondo 40mm","fechaduras","lock","mechanical","media","pado","porta externa","portas de abrir","puxador tubular","redondo","tubo","tubular","zamack"]},{"id":"fechadura-banheiro-pado-concept-407-cromado-canto-redondo-40mm","terms":["10 anos","40 mm","407","40mm","5 5 cm","banheiro","canto","concept","concept 407","cromado","externa","fecha dura","fechadra","fechadua","fechadura","fechadura banheiro pado concept 407 cromado canto redondo 40mm","fechadura externa","fechaduras","lavabo","lock","mechanical","media","pado","portas de abrir","puxador tubular","redondo","tubo","tubular","wc","zamack"]},{"id":"puxador-inox-tubular-polido-32mm-100cm","terms":["100","100 cm","1000mm","100cm","32mm","800mm","aco inox","alca","alta resistencia design moderno excelente ergonomia versatilidade de instalacao e acabamento sofisticado","dss","externa","handle","handles","inox","inoxidavel","polido escovado e preto","portas de abrir e portas de correr","portas e portoes","portas pivotantes portas de madeira vidro aluminio aco portas de correr e portoes","puchador","puxador","puxador inox tubular 32mm 100 cm","puxador tubular","puxadores","redondo","tipo tubular","tubo","tubular","tubular reto"]},{"id":"puxador-inox-tubular-32mm-80cm","terms":["32mm","600mm","80 cm","800mm","80cm","aco inox","alca","alta resistencia design moderno excelente ergonomia versatilidade de instalacao e acabamento sofisticado","dss","externa","handle","handles","inox","inoxidavel","portas de abrir e portas de correr","portas e portoes","portas pivotantes portas de madeira vidro aluminio aco portas de correr e portoes","preto escovado e polido","puchador","puxador","puxador inox tubular 32mm 80 cm","puxador tubular","puxadores","redondo","tipo tubular","tubo","tubular","tubular reto"]},{"id":"puxador-inox-tubular-32mm-60cm","terms":["32mm","400mm","60 cm","600mm","60cm","aco inox","alca","alta resistencia design moderno excelente ergonomia versatilidade de instalacao e acabamento sofisticado","dss","externa","handle","handles","inox","inoxidavel","portas de abrir e portas de correr","portas e portoes","portas pivotantes portas de madeira vidro aluminio aco portas de correr e portoes","preto escovado e polido","puchador","puxador","puxador inox tubular 32mm 60 cm","puxador tubular","puxadores","redondo","tipo tubular","tubo","tubular","tubular reto"]},{"id":"puxador-inox-tubular-32mm-45cm","terms":["300mm","32mm","45 cm","450mm","45cm","aco inox","alca","alta resistencia design moderno excelente ergonomia e acabamento sofisticado","dss","externa","handle","handles","inox","inoxidavel","polido escovado e preto","portas de abrir e portas de correr","portas e portoes","portas pivotantes portas de madeira vidro aluminio aco portas de correr e portoes","puchador","puxador","puxador inox tubular 32mm 45 cm","puxador tubular","puxadores","redondo","tipo tubular","tubo","tubular","tubular reto"]},{"id":"puxador-inox-tipo-u-40x20-120cm","terms":["1 20 m 40 mm 20 mm","1 20m","1200mm","1220mm","40 20","aco inox","alca","alta resistencia design moderno boa ergonomia e acabamento sofisticado","dss","externa","handle","handles","inox","inoxidavel","metros","portas de abrir e portas de correr","portas e portoes","preto polido dourado e escovado","puchador","puxador","puxador em u","puxador u","puxadores","puxadores inox tipo u 40 x 20 1 20 metros","tipo","tipo u"]},{"id":"puxador-inox-tipo-u-40x20-100cm","terms":["1 00 m 40 mm 20 mm","1000mm","1020mm","1m","40 20","aco inox","alca","alta resistencia design moderno boa ergonomia e acabamento sofisticado","dss","externa","handle","handles","inox","inoxidavel","metro","portas de abrir e portas de correr","portas e portoes","preto polido dourado e escovado","puchador","puxador","puxador em u","puxador u","puxadores","puxadores inox tipo u 40 x 20 1 metro","tipo","tipo u"]},{"id":"puxador-inox-tipo-u-40x20-80cm","terms":["40 20","80 cm","80 cm 40 mm 20 mm","800mm","80cm","820mm","aco inox","alca","alta resistencia design moderno boa ergonomia e acabamento sofisticado","dss","externa","handle","handles","inox","inoxidavel","portas de abrir e portas de correr","portas e portoes","preto polido dourado e escovado","puchador","puxador","puxador em u","puxador u","puxadores","puxadores inox tipo u 40 x 20 80 cm","tipo","tipo u"]},{"id":"puxador-inox-tipo-u-40x20-60cm","terms":["40 20","60 cm","60 cm 40 mm 20 mm","600mm","60cm","620mm","aco inox","alca","alta resistencia design moderno boa ergonomia e acabamento sofisticado","dss","escovado dourado polido e preto fosco","externa","handle","handles","inox","inoxidavel","portas de abrir e portas de correr","portas e portoes","puchador","puxador","puxador em u","puxador u","puxadores","puxadores inox tipo u 40 x 20 60 cm","tipo","tipo u"]},{"id":"puxador-inox-tipo-u-40x20-60cm","terms":["40 20","60 cm","60 cm 40 mm 20 mm","600mm","60cm","620mm","aco inox","alca","alta resistencia design moderno boa ergonomia e acabamento sofisticado","dss","escovado dourado polido e preto fosco","externa","handle","handles","inox","inoxidavel","portas de abrir e portas de correr","portas e portoes","puchador","puxador","puxador em u","puxador u","puxadores","puxadores inox tipo u 40 x 20 60 cm","tipo","tipo u"]},{"id":"puxador-inox-tipo-u-40x20-40cm","terms":["40 20","40 cm","40 cm 40 mm 20 mm","400mm","40cm","420mm","aco inox","alca","alta resistencia design moderno boa ergonomia e acabamento sofisticado","dourado polido preto fosco e escovado","dss","externa","handle","handles","inox","inoxidavel","portas de abrir e portas de correr","portas e portoes","puchador","puxador","puxador em u","puxador u","puxadores","puxadores inox tipo u 40 x 20 40 cm","tipo","tipo u"]},{"id":"puxador-inox-tipo-u-30x15-60cm","terms":["30 15","60 cm","60 cm 30 mm 15 mm","600mm","60cm","aco inox","alca","alta resistencia design moderno boa ergonomia e acabamento sofisticado","dss","externa","handle","handles","inox","inoxidavel","portas de abrir e portas de correr","portas e portoes","preto polido dourado e escovado","puchador","puxador","puxador em u","puxador u","puxadores","puxadores inox tipo u 30 x 15 60 cm","tipo","tipo u"]},{"id":"puxador-inox-tipo-u-30x15-40cm","terms":["30 15","40 cm","40 cm 30 mm 15 mm","400mm","40cm","aco inox","alca","alta resistencia design moderno boa ergonomia e acabamento sofisticado","dss","externa","handle","handles","inox","inoxidavel","polido dourado preto e escovado","portas de abrir e portas de correr","portas e portoes","puchador","puxador","puxador em u","puxador u","puxadores","puxadores inox tipo u 30 x 15 40 cm","tipo","tipo u"]},{"id":"puxador-inox-tipo-u-30x15-30cm","terms":["30 15","30 cm","30 cm 30 mm 15 mm","300mm","30cm","aco inox","alca","alta resistencia design moderno boa ergonomia e acabamento sofisticado","dourado polido preto e escovado","dss","externa","handle","handles","inox","inoxidavel","portas de abrir e portas de correr","portas e portoes","puchador","puxador","puxador em u","puxador u","puxadores","puxadores inox tipo u 30 x 15 30 cm","tipo","tipo u"]},{"id":"puxador-inox-tipo-u-20x10-60cm","terms":["20 10","20x10","60 cm","60 cm 20 mm 10 mm","600mm","60cm","aco inox","alca","alta resistencia design moderno ergonomia e acabamento sofisticado","dourado polido escovado e preto","dss","externa","handle","handles","inox","inoxidavel","portas de abrir e portas de correr","portas e portoes","puchador","puxador","puxador em u","puxador u","puxadores","puxadores inox tipo u 20x10 60 cm","tipo","tipo u"]},{"id":"puxador-inox-tipo-u-20x10-30cm","terms":["20 10","20x10","30 cm","30 cm 20 mm 10 mm","300mm","30cm","aco inox","alca","alta resistencia design moderno ergonomia e acabamento sofisticado","dss","externa","handle","handles","inox","inoxidavel","portas de abrir e portas de correr","portas e portoes","preto dourado polido e escovado","puchador","puxador","puxador em u","puxador u","puxadores","puxadores inox tipo u 20x10 30 cm","tipo","tipo u"]},{"id":"puxador-inox-tipo-u-20x10-40cm","terms":["20 10","20x10","40 cm","40 cm 20 mm 10 mm","400mm","40cm","aco inox","alca","alta resistencia design moderno ergonomia e acabamento sofisticado","dourado polido escovado e preto","dss","externa","handle","handles","inox","inoxidavel","portas de abrir e portas de correr","portas e portoes","puchador","puxador","puxador em u","puxador u","puxadores","puxadores inox tipo u 20x10 40 cm","tipo","tipo u"]}];
  const SEARCH_GENERIC_RULES=[{"terms":["dobradica","dobradicas","dobradissa","dobradisa"],"category":"hinges"},{"terms":["puxador","puxadores","puchador"],"category":"handles"},{"terms":["fechadura","fechaduras","fecha dura"],"category":"all-locks"},{"terms":["fechadura digital","fechadura eletronica","smart lock","smartlock"],"category":"digital"},{"terms":["olho magico","olho magico de porta","visor","visor de porta","visor porta"],"category":"eyelet"},{"terms":["mola","mola aerea","mola de piso"],"category":"springs"},{"terms":["cadeado","cadeados"],"category":"padlocks"},{"terms":["vedacao","vedacao porta","veda porta","veda frestas"],"category":"sealing"},{"terms":["puxador tubular","tubular"],"category":"tubular-handles"},{"terms":["puxador tipo u","tipo u","puxador u"],"category":"u-handles"},{"terms":["puxador tipo h","tipo h","puxador h"],"category":"h-handles"},{"terms":["porta de correr","porta correr","deslizante"],"category":"sliding"}];
  const SEARCH_INTENT_BY_ID=new Map(SEARCH_INTENT_RULES.map(r=>[r.id,r.terms]));
  const SEARCH_GENERIC_TERMS=SEARCH_GENERIC_RULES.flatMap(r=>r.terms);

  const SEARCH_STOPWORDS=new Set(["a","o","as","os","de","da","do","das","dos","e","em","para","por","com","um","uma","uns","umas","na","no","nas","nos"]);
  const searchTokens=s=>normalize(s).split(/\s+/).map(x=>x.replace(/[^a-z0-9]/g,"")).filter(x=>x && !SEARCH_STOPWORDS.has(x));
  function editDistance(a,b){
    if(a===b) return 0;
    if(!a) return b.length; if(!b) return a.length;
    let prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      const cur=[i];
      for(let j=1;j<=b.length;j++) cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      prev=cur;
    }
    return prev[b.length];
  }
  function searchSimilarity(token, candidate){
    if(token===candidate) return 1;
    if(candidate.includes(token) || token.includes(candidate)) return 0.92;
    const maxLen=Math.max(token.length,candidate.length);
    if(maxLen<4) return 0;
    const d=editDistance(token,candidate);
    const allowed=maxLen>=8?2:1;
    return d<=allowed ? 1-(d/maxLen) : 0;
  }
  function intelligentSearchScore(p,q){
    if(!q) return 1;
    const text=PRODUCT_SEARCH_TEXT.get(p.id)||"";
    const name=normalize(p.name||"");
    const description=normalize([
      p.description,JSON.stringify(p.basic),JSON.stringify(p.technical),
      p.subcategory,p.category,p.brand,p.material,p.handleType,p.handleSize,
      p.mechanicalType,p.mechanicalDoor,p.digitalInstall,p.digitalDoor,
      p.hingeType,p.hingeCorner
    ].filter(Boolean).join(" "));
    const query=normalize(q);
    const tokens=searchTokens(query);
    if(!tokens.length) return 1;

    // 1) Regra de intenção: se uma expressão cadastrada para este produto
    // aparece na pesquisa, ela é uma correspondência forte.
    const intentTerms=SEARCH_INTENT_BY_ID.get(p.id)||[];
    let intentBest=0;
    for(const term of intentTerms){
      const t=normalize(term);
      if(!t) continue;
      if(query===t) intentBest=Math.max(intentBest,1);
      else if(query.includes(t) && t.split(/\s+/).length>1) intentBest=Math.max(intentBest,0.99);
      else if(t.includes(query) && query.length>=3 && t.split(/\s+/).length>1) intentBest=Math.max(intentBest,0.94);
    }

    // 2) Intenção por categoria ampla: "dobradiça" deve trazer a família inteira,
    // mas "dobradiça inox" deve continuar restringindo por inox.
    let genericBest=0;
    for(const rule of SEARCH_GENERIC_RULES){
      if(rule.terms.some(term=>query===normalize(term))){
        const cat=rule.category;
        const catText=normalize([
          p.category,p.subcategory,p.name,p.brand,p.material,
          JSON.stringify(p.basic),JSON.stringify(p.technical)
        ].filter(Boolean).join(" "));
        if(cat==="all-locks" ? catText.includes("fechadura") :
           cat==="hinges" ? (p.category==="hinges" || catText.includes("dobrad")) :
           cat==="handles" ? (p.category==="handles" || catText.includes("puxador")) :
           cat==="digital" ? (catText.includes("digital") || catText.includes("eletron")) :
           cat==="eyelet" ? (catText.includes("olho magico") || catText.includes("visor")) :
           cat==="springs" ? catText.includes("mola") :
           cat==="padlocks" ? catText.includes("cadeado") :
           cat==="sealing" ? (catText.includes("ved") || catText.includes("veda")) :
           cat==="tubular-handles" ? (p.category==="handles" && catText.includes("tubular")) :
           cat==="u-handles" ? (p.category==="handles" && (catText.includes("tipo u") || catText.includes(" tipo u "))) :
           cat==="h-handles" ? (p.category==="handles" && (catText.includes("tipo h") || catText.includes(" tipo h "))) :
           cat==="sliding" ? catText.includes("correr") :
           false) genericBest=Math.max(genericBest,0.98);
      }
    }

    let total=0;
    for(const token of tokens){
      const alternatives=[token,...(SEARCH_SYNONYMS[token]||[])].flatMap(searchTokens);
      let best=0;
      for(const alt of alternatives){
        if(name.includes(alt)) best=Math.max(best,1);
        else if(description.includes(alt)) best=Math.max(best,0.90);
        else {
          const candidates=searchTokens(text);
          for(const c of candidates) best=Math.max(best,searchSimilarity(alt,c)*0.84);
        }
      }
      total += best;
    }
    const tokenScore=total/tokens.length;

    // A intenção explícita ou uma regra de família prevalece sobre pequenas
    // diferenças de escrita. Para pesquisas compostas, ainda exigimos que
    // os outros termos (ex.: material/medida) sejam compatíveis.
    if(intentBest) return Math.max(tokenScore,intentBest);
    if(genericBest) return Math.max(tokenScore,genericBest);
    return tokenScore;
  }
  // BLOCO DE BUSCA: cada família tem seu próprio resultado.
  // A classificação também usa tolerância a pequenos erros de digitação.
  const SEARCH_BLOCK_RULES=[
    {block:"hinges", terms:["dobradica","dobradicas","dobradissa","dobradicas de porta","hinge","hinges"]},
    {block:"handles", terms:["puxador","puxadores","puchador","handle","handles"]},
    {block:"digital", terms:["fechadura digital","fechadura eletronica","fechadura eletronica para movel","fechadura para movel","fechadura de movel","fechadura movel","smart lock","smartlock"]},
    {block:"mechanical", terms:["fechadura mecanica","fechadura mecânica","fechadura mecanica para porta","fechadura para porta de madeira","fechadura porta madeira","fechadura de madeira","mechanical lock"]},
    {block:"all-locks", terms:["fechadura","fechaduras","lock","locks"]},
    {block:"eyelet", terms:["visor","visor de porta","visor porta","olho magico","olho magico de porta","olho magico porta"]},
    {block:"springs", terms:["mola","molas","mola aerea","mola de piso"]},
    {block:"padlocks", terms:["cadeado","cadeados","padlock","padlocks"]},
    {block:"sealing", terms:["vedacao","vedacao porta","veda porta","veda frestas"]},
    {block:"tubular-handles", terms:["puxador tubular","tubular"]},
    {block:"u-handles", terms:["puxador tipo u","puxador u","tipo u"]},
    {block:"h-handles", terms:["puxador tipo h","puxador h","tipo h"]}
  ];
  function searchBlockMatchesProduct(p,block){
    if(!block) return true;
    const text=normalize([p.name,p.description,p.category,p.subcategory,p.brand,p.material,JSON.stringify(p.basic),JSON.stringify(p.technical)].filter(Boolean).join(" "));
    if(block==="all-locks") return p.category==="digital" || p.category==="mechanical" || text.includes("fechadura");
    if(block==="hinges") return p.category==="hinges" || text.includes("dobrad");
    if(block==="handles" || block==="tubular-handles" || block==="u-handles" || block==="h-handles"){
      if(p.category!=="handles") return false;
      if(block==="tubular-handles") return text.includes("tubular");
      if(block==="u-handles") return text.includes("tipo u") || text.includes("puxador u");
      if(block==="h-handles") return text.includes("tipo h") || text.includes("puxador h");
      return true;
    }
    if(block==="digital") return p.category==="digital";
    if(block==="mechanical") return p.category==="mechanical";
    if(block==="eyelet") return text.includes("olho magico") || text.includes("visor");
    if(block==="springs") return text.includes("mola");
    if(block==="padlocks") return text.includes("cadeado");
    if(block==="sealing") return text.includes("ved") || text.includes("veda");
    return true;
  }
  function classifySearchBlock(q){
    const query=normalize(q);
    if(!query) return "";
    let best={block:"",score:0};
    for(const rule of SEARCH_BLOCK_RULES){
      for(const term of rule.terms){
        const t=normalize(term);
        if(!t) continue;
        if(query===t) return rule.block;
        if(query.includes(t) && t.length>=5){
          const score=.94 + Math.min(.05,t.length/200);
          if(score>best.score) best={block:rule.block,score};
        }
        const sim=searchSimilarity(query,t);
        if(sim>best.score && sim>=.68) best={block:rule.block,score:sim};
      }
    }
    return best.block;
  }

  function intelligentSearchMatch(p,q){
    if(!q) return true;
    const query=normalize(q);
    const terms=SEARCH_INTENT_BY_ID.get(p.id)||[];
    const direct=terms.some(term=>{
      const t=normalize(term);
      return t && query===t;
    });
    if(direct) return true;
    const score=intelligentSearchScore(p,q);
    // Busca curta: tolerância alta para sinônimos e erros de digitação.
    // Busca composta: a maior parte da intenção precisa ser encontrada.
    return score >= (searchTokens(query).length===1 ? 0.64 : 0.60);
  }

  const I18N = {
    pt:{
      "nav.home":"Início","nav.products":"Categorias","nav.catalog":"Produtos","nav.about":"Sobre Nós","nav.quality":"Garantias e Qualidade","nav.brands":"Marcas parceiras","nav.quote":"Solicitar Orçamento","nav.quoteShort":"Orçamento",
      "hero.0.title":"Segurança que transforma a entrada.","hero.1.title":"A excelência está nos detalhes.","hero.2.title":"Elegância clássica para entradas marcantes.","hero.cta":"Explorar",
      "categories.eyebrow":"COLEÇÃO","categories.title":"Categorias","categories.note":"Explore a estrutura do catálogo.",
      "service.eyebrow":"ATENDIMENTO QUE APROXIMA","service.title":"Próximo a você, em cada escolha.","service.text":"Na Designer Fechaduras, você não fala com robôs. Fala com pessoas que conhecem nossos produtos, entendem de fechaduras e ferragens e estão prontas para ouvir, tirar suas dúvidas e ajudar você a encontrar a escolha certa para o seu projeto — com a mesma atenção e cuidado de quem estivesse ao seu lado dentro da nossa loja.",
      "catalog.eyebrow":"CATÁLOGO","catalog.title":"Produtos","catalog.search":"Buscar por produto, categoria, material ou medida...","catalog.allBrands":"Todas as marcas","catalog.allSubcategories":"Todas as subcategorias","catalog.allMaterials":"Todos os materiais","catalog.clear":"Limpar filtros","catalog.empty":"Nenhum produto encontrado.","brands.eyebrow":"PARCERIAS E MARCAS","brands.title":"Marcas parceiras","brands.note":"Conheça as marcas presentes em nosso catálogo.",
      "about.eyebrow":"SOBRE NÓS","about.title":"Design, segurança e detalhes que fazem a diferença","about.p1":"Desde 2006, somos referência em fechaduras, ferragens e acessórios premium em São José-SC, oferecendo soluções que unem design, qualidade e segurança para projetos exclusivos.","about.p2":"Acreditamos que os detalhes transformam um ambiente. Por isso, trabalhamos com produtos selecionados das principais marcas do mercado, pensados para valorizar cada porta, cada espaço e cada projeto.","about.p3":"Atendemos arquitetos, designers, construtoras e clientes que buscam acabamento impecável, oferecendo produtos originais, atendimento especializado e a experiência de uma loja física presente na região há quase duas décadas.","about.p4":"Mais do que fechaduras e acessórios, entregamos detalhes que elevam o design da sua casa — com sofisticação, funcionalidade e qualidade em cada escolha.","about.signature":"Designer Fechaduras. Desde 2006, transformando projetos através dos detalhes.",
      "quality.eyebrow":"CONFIANÇA","quality.title":"Garantias e Qualidade","quality.1":"Qualidade","quality.1.desc":"Produtos selecionados com foco em acabamento, durabilidade e desempenho para projetos exigentes.","quality.2":"Curadoria","quality.2.desc":"Uma seleção cuidadosa de marcas, linhas e acabamentos para combinar estética, função e projeto.","quality.3":"Confiança","quality.3.desc":"Atendimento próximo e compromisso com produtos originais, orientação segura e uma experiência transparente.","quality.4":"Conhecimento técnico","quality.4.desc":"Experiência para orientar especificações, aplicações, medidas e escolhas de acabamento em cada projeto.",
      "quote.eyebrow":"ORÇAMENTO","quote.title":"Monte seu orçamento.","quote.text":"Adicione produtos ao carrinho e envie sua solicitação pelo WhatsApp.",
      "cart.title":"Carrinho de orçamento","cart.empty":"Seu orçamento está vazio.","cart.continue":"Continuar navegando","cart.request":"Solicitar Orçamento",
      "product.colors":"Cores disponíveis","product.basic":"Informações principais","product.technical":"Informações técnicas","product.technicalVisual":"Desenhos técnicos","product.viewTechnical":"Ver Informações Técnicas","product.included":"Acompanha o produto","product.add":"Adicionar ao orçamento","footer.text":"Ferragens, fechaduras e acessórios para projetos."
    },
    en:{
      "nav.home":"Home","nav.products":"Category","nav.catalog":"Products","nav.about":"About Us","nav.quality":"Guarantees & Quality","nav.brands":"Partner brands","nav.quote":"Request a Quote","nav.quoteShort":"Quote",
      "hero.0.title":"Security that transforms the entrance.","hero.1.title":"Excellence is in the details.","hero.2.title":"Classic elegance for striking entrances.","hero.cta":"Explore",
      "categories.eyebrow":"COLLECTION","categories.title":"Categories","categories.note":"Explore the catalog structure.",
      "service.eyebrow":"SERVICE THAT CONNECTS","service.title":"Close to you, with every choice.","service.text":"At Designer Fechaduras, you do not talk to robots. You talk to people who know our products, understand locks and hardware, and are ready to listen, answer your questions and help you find the right choice for your project — with the same care and attention you would receive inside our store.",
      "catalog.eyebrow":"CATALOG","catalog.title":"Products","catalog.search":"Search by product, category, material or size...","catalog.allBrands":"All brands","catalog.allSubcategories":"All subcategories","catalog.allMaterials":"All materials","catalog.clear":"Clear filters","catalog.empty":"No products found.","brands.eyebrow":"PARTNERSHIPS & BRANDS","brands.title":"Partner brands","brands.note":"Discover the brands featured in our catalog.",
      "about.eyebrow":"ABOUT US","about.title":"Design, security and details that make the difference","about.p1":"Since 2006, we have been a reference in premium locks, hardware and accessories in São José-SC, offering solutions that combine design, quality and security for exclusive projects.","about.p2":"We believe details transform an environment. That is why we work with selected products from leading brands, designed to enhance every door, every space and every project.","about.p3":"We serve architects, designers, builders and clients seeking impeccable finishes, offering original products, specialized service and the experience of a physical store established in the region for nearly two decades.","about.p4":"More than locks and accessories, we deliver details that elevate the design of your home — with sophistication, functionality and quality in every choice.","about.signature":"Designer Fechaduras. Since 2006, transforming projects through details.",
      "quality.eyebrow":"TRUST","quality.title":"Guarantees & Quality","quality.1":"Quality","quality.1.desc":"Selected products focused on finish, durability and performance for demanding projects.","quality.2":"Curation","quality.2.desc":"A careful selection of brands, lines and finishes to balance aesthetics, function and project needs.","quality.3":"Trust","quality.3.desc":"Personal service and commitment to original products, reliable guidance and a transparent experience.","quality.4":"Technical knowledge","quality.4.desc":"Experience to guide specifications, applications, measurements and finish choices for each project.",
      "quote.eyebrow":"QUOTE","quote.title":"Build your quote.","quote.text":"Add products to the quote cart and send your request through WhatsApp.",
      "cart.title":"Quote cart","cart.empty":"Your quote is empty.","cart.continue":"Continue browsing","cart.request":"Request a Quote",
      "product.colors":"Available colors","product.basic":"Key information","product.technical":"Technical information","product.technicalVisual":"Technical drawings","product.viewTechnical":"View Technical Information","product.included":"Included","product.add":"Add to quote","footer.text":"Hardware, locks and accessories for projects."
    }
  };

  const categories = [
    {key:"digital",pt:"Fechaduras Digitais",en:"Digital Locks",descPt:"Tecnologia e acesso inteligente.",descEn:"Technology and smart access."},
    {key:"mechanical",pt:"Fechaduras Mecânicas",en:"Mechanical Locks",descPt:"Soluções mecânicas para diferentes aplicações.",descEn:"Mechanical solutions for different applications."},
    {key:"hinges",pt:"Dobradiças",en:"Hinges",descPt:"Estrutura preparada para tamanhos e acabamentos.",descEn:"Structure prepared for sizes and finishes."},
    {key:"handles",pt:"Puxadores",en:"Handles",descPt:"Tipos H, U e tubular.",descEn:"H, U and tubular types."},
    {key:"accessories",pt:"Acessórios",en:"Accessories",descPt:"Cilindros, máquinas, molas e outros acessórios.",descEn:"Cylinders, lock bodies, closers and other accessories."},
    {key:"auxiliares",pt:"Auxiliares",en:"Auxiliary",descPt:"Soluções auxiliares para portas e projetos.",descEn:"Auxiliary solutions for doors and projects."}
  ];

  const tagLabels = {
    biometria:{pt:"Biometria",en:"Biometrics"},facial:{pt:"Reconhecimento facial",en:"Facial recognition"},senha:{pt:"Senha",en:"Password"},
    rfid:{pt:"RFID",en:"RFID"},aplicativo:{pt:"Aplicativo",en:"App"},bluetooth:{pt:"Bluetooth",en:"Bluetooth"},"wi-fi":{pt:"Wi‑Fi",en:"Wi‑Fi"},
    "chave mecanica":{pt:"Chave mecânica",en:"Mechanical key"},moveis:{pt:"Móveis",en:"Furniture"},embutir:{pt:"Embutir",en:"Mortise"},sobrepor:{pt:"Sobrepor",en:"Surface mounted"}
  };

  function t(key){ return I18N[state.lang][key] || key; }
  function escapeHtml(s){return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  const API_BASE="/api";
  async function apiFetch(path,options={}){const response=await fetch(API_BASE+path,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})},credentials:"include"});let data={};try{data=await response.json()}catch{}if(!response.ok){const err=new Error(data.error||"Não foi possível concluir a operação.");err.status=response.status;throw err}return data}
  function applyI18n(){
    document.documentElement.lang = state.lang === "pt" ? "pt-BR" : "en";
    document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));
    renderCategories(); renderCategoryFilter(); renderBrands(); renderSubcategories(); renderMaterials(); renderColors(); renderChips(); renderMechanicalSubcategories(); renderDigitalSubcategories(); renderAccessorySubcategories(); renderHingeSubcategories(); renderHandlesSubcategories(); renderCategoryShowAll(); render(); decorateEmptyOptionCards(); renderCart();
  }

  // Hero slideshow
  const dots = $("heroDots");
  function buildHeroDots(){
    dots.innerHTML = "";
    [0,1,2].forEach(i => {
      const b=document.createElement("button"); b.className="hero-dot"+(i===state.slide?" active":""); b.type="button";
      b.setAttribute("aria-label", `${i+1}`); b.onclick=()=>goSlide(i); dots.appendChild(b);
    });
  }

  // HERO — controlador único dos vídeos cinematográficos.
  // Os três arquivos permanecem no diretório "Todas as Imagens/Videos".
  const heroVideos = Array.from(document.querySelectorAll(".hero-slide video.hero-video"));
  const heroTexas = document.querySelector(".hero-slide-texas .hero-video-2");
  let texasRestarting = false;

  function videoSource(video){
    return video?.dataset?.videoSrc || video?.querySelector("source")?.src || video?.getAttribute("src") || "";
  }

  function prepareHeroVideo(video,loadNow=true){
    if(!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = false;
    video.preload = loadNow ? "auto" : "metadata";
    if(loadNow){
      const src = videoSource(video);
      if(src && video.getAttribute("src") !== src){ video.src = src; }
      if(video.readyState < 2){ try{ video.load(); }catch{} }
    }
  }

  function playHeroVideo(video){
    if(!video) return;
    prepareHeroVideo(video);
    if(document.hidden) return;
    const attempt = video.play();
    if(attempt && typeof attempt.catch === "function") attempt.catch(()=>{});
  }

  function syncHeroVideos(){
    heroVideos.forEach((video,index)=>{
      const active = index === state.slide;
      if(active){
        playHeroVideo(video);
      }else{
        video.preload="none";
        if(!video.paused) video.pause();
      }
    });
  }

  function restartTexasSmoothly(){
    if(!heroTexas || texasRestarting || document.hidden || state.slide !== 1) return;
    texasRestarting = true;
    const slide = heroTexas.closest(".hero-slide-texas");
    slide?.classList.add("is-video-restarting");
    try{ heroTexas.currentTime = 0; }catch{}
    playHeroVideo(heroTexas);
    setTimeout(()=>{
      slide?.classList.remove("is-video-restarting");
      texasRestarting = false;
    },180);
  }

  function goSlide(i){
    state.slide=(i+3)%3;
    document.querySelectorAll(".hero-slide").forEach((slide,n)=>slide.classList.toggle("is-active",n===state.slide));
    syncHeroVideos();
    buildHeroDots();
  }

  $("heroPrev").onclick=()=>goSlide(state.slide-1);
  $("heroNext").onclick=()=>goSlide(state.slide+1);
  buildHeroDots();

  heroVideos.forEach((video,index)=>{
    prepareHeroVideo(video,index===state.slide);
    video.addEventListener("loadedmetadata",syncHeroVideos,{once:false});
    video.addEventListener("canplay",syncHeroVideos,{once:false});
    video.addEventListener("playing",()=>video.closest(".hero-slide")?.classList.add("video-ready"));
    video.addEventListener("error",()=>{
      const active=video.closest(".hero-slide")?.classList.contains("is-active");
      const src=videoSource(video);
      if(active && src && !video.dataset.retryAttempted){
        video.dataset.retryAttempted="1";
        try{ video.src=src; video.load(); playHeroVideo(video); }catch{}
      }
    });
  });
  heroTexas?.addEventListener("ended",restartTexasSmoothly);
  ["pointerdown","touchstart","keydown"].forEach(eventName=>{
    document.addEventListener(eventName,()=>{
      const active=heroVideos[state.slide];
      if(active && active.paused) playHeroVideo(active);
    },{passive:true,once:false});
  });
  syncHeroVideos();
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden) heroVideos.forEach(video=>video.pause());
    else syncHeroVideos();
  });

  // Botões "Ver produto" do hero: cada slide abre diretamente o produto correspondente.
  // Slide 1 → PARIS | Slide 2 → TEXAS | Slide 3 → BLIM-BLIM.
  document.querySelectorAll(".hero-product-link").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      const productId = link.dataset.productId || (link.getAttribute("href") || "").replace("#produto=", "");
      const product = PRODUCTS.find(p => p.id === decodeURIComponent(productId));
      if (product) navigateToProduct(product);
    });
  });

  let heroTimer=0;
  const startHeroTimer=()=>{if(!heroTimer && !document.hidden) heroTimer=setInterval(()=>goSlide(state.slide+1),15000)};
  const stopHeroTimer=()=>{if(heroTimer){clearInterval(heroTimer);heroTimer=0}};
  startHeroTimer();
  document.addEventListener("visibilitychange",()=>document.hidden?stopHeroTimer():startHeroTimer());

  // Hero Signature: parallax 3D leve, brilho responsivo e pausa inteligente no hover.
  document.querySelectorAll('.hero-slide-luxury').forEach(luxuryHero=>{
    const luxuryProduct=luxuryHero.querySelector('.hero-product');
    const luxuryStage=luxuryHero.querySelector('.hero-product-stage');
    if(!luxuryProduct || !luxuryStage) return;
    let raf=0, px=0, py=0;
    const paintLuxury=()=>{
      raf=0;
      const x=px*10, y=py*7;
      const productScale = luxuryHero.classList.contains('hero-slide-texas') ? 1.25 : 1.012;
      luxuryProduct.style.transform=`translate3d(${x}px,calc(-50% + ${y}px),0) rotateY(${px*3.2}deg) rotateX(${-py*2.4}deg) scale(${productScale})`;
      luxuryStage.style.setProperty('--mx', `${50+px*18}%`);
      luxuryStage.style.setProperty('--my', `${50+py*18}%`);
    };
    const onMove=(e)=>{
      const r=luxuryHero.getBoundingClientRect();
      px=((e.clientX-r.left)/r.width-.5)*2;
      py=((e.clientY-r.top)/r.height-.5)*2;
      if(!raf) raf=requestAnimationFrame(paintLuxury);
    };
    const reset=()=>{px=0;py=0;if(!raf)raf=requestAnimationFrame(paintLuxury);};
    luxuryHero.addEventListener('pointermove',onMove,{passive:true});
    luxuryHero.addEventListener('pointerleave',reset,{passive:true});
    luxuryHero.addEventListener('pointerenter',()=>luxuryHero.classList.add('is-interacting'),{passive:true});
    luxuryHero.addEventListener('pointerleave',()=>luxuryHero.classList.remove('is-interacting'),{passive:true});
  });

  // Categories
  let categoryCarouselTimer=0;
  function renderCategories(){
    const track=$("categoryTrack");
    if(categoryCarouselTimer)clearInterval(categoryCarouselTimer);
    categoryCarouselTimer=0;
    track.innerHTML="";
    categories.forEach((c,i)=>{
      const card=document.createElement("article"); card.className="category-card";
      card.tabIndex=0; card.setAttribute("role","link"); card.setAttribute("aria-label", state.lang==="pt"?`Explorar ${c.pt}`:`Explore ${c.en}`);
      // O carrossel usa somente produtos da própria categoria.
      // Ao adicionar novos produtos em PRODUCTS com a mesma "category",
      // eles entram automaticamente no carrossel dessa categoria.
      const categoryProducts = PRODUCTS.filter(p=>p.category===c.key && p.cover && (!p.strictPlacementOnly || c.key==="handles"));
      const categoryImages = [...new Map(
        categoryProducts.map(p=>[p.id, {src:p.cover, name:p.name}])
      ).values()];
      card.innerHTML=`<div class="category-bg" aria-hidden="true">${categoryImages.map((item,n)=>`<img src="${item.src}" class="${n===0?"is-active":""}" loading="${n<2?"eager":"lazy"}" decoding="async" alt="">`).join("")}<span class="category-bg-overlay"></span></div><span class="category-number">0${i+1}</span><h3>${escapeHtml(state.lang==="pt"?c.pt:c.en)}</h3><p>${escapeHtml(state.lang==="pt"?c.descPt:c.descEn)}</p><a href="#catalogo">${state.lang==="pt"?"Explorar categoria":"Explore category"} ↗</a>`;
      card.dataset.carouselCount=categoryImages.length;
      card.dataset.categoryKey=c.key;
      card.onclick=(e)=>{e.preventDefault();e.stopPropagation();selectCategory(c.key);};
      card.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();selectCategory(c.key)}};
      track.appendChild(card);
    });
    const cards=[...track.querySelectorAll(".category-card")];
    if(cards.some(card=>card.querySelectorAll(".category-bg img").length>1)){
      categoryCarouselTimer=setInterval(()=>{
        cards.forEach(card=>{
          const images=card.querySelectorAll(".category-bg img");
          if(images.length<2)return;
          const current=Number(card.dataset.imageIndex||0);
          images[current].classList.remove("is-active");
          const next=(current+1)%images.length;
          images[next].classList.add("is-active");
          card.dataset.imageIndex=next;
        });
      },3000);
    }
    updateCategoryPage();
  }
  function updateCategoryPage(){
    const cards=[...document.querySelectorAll(".category-card")];
    const visible=window.innerWidth<651?1:window.innerWidth<951?2:window.innerWidth<1201?3:5;
    state.catPage=Math.max(0,Math.min(state.catPage,Math.max(0,cards.length-visible)));
    cards.forEach((c,i)=>c.style.display=(i>=state.catPage && i<state.catPage+visible)?"flex":"none");
  }
  $("catPrev").onclick=()=>{state.catPage--;updateCategoryPage()};
  $("catNext").onclick=()=>{state.catPage++;updateCategoryPage()};
  window.addEventListener("resize",updateCategoryPage);
  function setSubcatGuidance(id, text){
    const wrap=$(id);
    const el=wrap?.querySelector('[data-subcat-guidance]');
    if(el) el.textContent=text;
  }

  // REGRA SOBERANA DE DISPONIBILIDADE:
  // toda categoria, subcategoria ou marca sem produtos deve mostrar
  // uma mensagem visível informando que produtos serão adicionados em breve.
  function emptyProductsNotice(){
    return `<span class="empty-product-notice" aria-label="Produtos serão adicionados em breve">Produtos serão adicionados em breve</span>`;
  }

  function optionCardHasProducts(card){
    if(!card) return true;

    if(card.classList.contains('category-card')){
      const key=card.dataset.categoryKey;
      return PRODUCTS.some(p=>p.category===key);
    }

    const install=card.dataset.install;
    if(install){
      return PRODUCTS.some(p=>p.category==='digital' && normalize(p.digitalInstall||'')===normalize(install));
    }

    const mech=card.dataset.mechanicalLock;
    if(mech){
      return PRODUCTS.some(p=>p.category==='mechanical' && normalize(p.mechanicalType||'')===normalize(mech));
    }

    const mechDoor=card.dataset.mechanicalDoor;
    if(mechDoor){
      const selectedType=state.mechanicalLockType;
      return PRODUCTS.some(p=>p.category==='mechanical'
        && (!selectedType || normalize(p.mechanicalType||'')===normalize(selectedType))
        && ((Array.isArray(p.mechanicalDoors) && p.mechanicalDoors.some(d=>normalize(d)===normalize(mechDoor)))
            || normalize(p.subcategory||'')===normalize(mechDoor)));
    }

    const accessory=card.dataset.accessorySubcategory;
    if(accessory){
      return PRODUCTS.some(p=>p.category==='accessories' && normalize(p.subcategory||'')===normalize(accessory));
    }

    const hingeMaterial=card.dataset.hingeMaterialSubcategory;
    if(hingeMaterial){
      return PRODUCTS.some(p=>p.category==='hinges' && isHingeMaterial(p, hingeMaterial));
    }

    const hingeCorner=card.dataset.hingeCornerSubcategory;
    if(hingeCorner){
      return PRODUCTS.some(p=>isHingeProduct(p) && normalize(p.hingeCorner||'')===normalize(hingeCorner));
    }

    const handleType=card.dataset.handlesType;
    if(handleType){
      return PRODUCTS.some(p=>p.category==='handles' && normalize(p.handleType||'')===normalize(handleType));
    }

    const handleSize=card.dataset.handlesSize;
    if(handleSize){
      return PRODUCTS.some(p=>p.category==='handles' && normalize(p.handleType||'')===normalize(state.handlesType||'') && normalize(p.handleSize||'')===normalize(handleSize));
    }

    const sub=card.dataset.subcategory;
    if(sub){
      const parts=String(sub).split('|');
      if(parts[0]==='Digital'){
        const install=parts[1]||'';
        const door=parts[2]||'';
        return PRODUCTS.some(p=>p.category==='digital'
          && normalize(p.digitalInstall||'')===normalize(install)
          && (!door || normalize(p.digitalDoor||'')===normalize(door)));
      }
      if(parts[0]==='Accessory') return PRODUCTS.some(p=>p.category==='accessories' && normalize(p.subcategory||'')===normalize(parts.slice(1).join('|')));
      if(parts[0]==='Hinge') return PRODUCTS.some(p=>isHingeProduct(p) && normalize(p.subcategory||'')===normalize(parts.slice(1).join('|')));
    }

    return true;
  }

  function scrollToEmptyProductsArea(){
    const empty=$('emptyState');
    if(!empty) return;
    empty.hidden=false;
    empty.textContent='Produtos serão adicionados em breve';
    empty.classList.add('empty-state--coming-soon');
    requestAnimationFrame(()=>{
      const top=empty.getBoundingClientRect().top+window.scrollY-96;
      window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
    });
  }

  function bindEmptyCardNavigation(card){
    // MARCAS PARCEIRAS: a navegação do card é exclusiva do HERO da marca.
    if(card?.classList.contains('brand-card')) return;
    if(!card || card.dataset.emptyNavigationBound==='1') return;
    if(!card.querySelector(':scope > .empty-product-notice')) return;
    card.dataset.emptyNavigationBound='1';
    const originalClick=card.onclick;
    card.onclick=(e)=>{
      if(typeof originalClick==='function') originalClick.call(card,e);
      window.setTimeout(scrollToEmptyProductsArea,140);
    };
    // Cards de marcas sem produtos abrem primeiro o showcase correspondente;
    // depois levam o usuário diretamente à área de disponibilidade.
    if(card.classList.contains('brand-card')){
      const key=card.dataset.brandPartner||'';
      const showcaseMap={
        dss:'brandShowcaseDss',virtus:'brandShowcaseVirtus',zen:'brandShowcaseZen',
        hafele:'brandShowcaseHafele',imab:'brandShowcaseImab',pado:'brandShowcasePado',
        stam:'brandShowcaseStam',haga:'brandShowcaseHaga',uniao:'brandShowcaseUniao',
        '3f':'brandShowcase3f',assa:'brandShowcaseAssa',papaiz:'brandShowcasePapaiz',
        fermax:'brandShowcaseFermax',perfil:'brandShowcasePerfil',silvana:'brandShowcaseSilvana'
      };
      const showcaseId=showcaseMap[key];
      if(showcaseId){
        card.onclick=(e)=>{
          if(typeof originalClick==='function') originalClick.call(card,e);
          window.setTimeout(()=>{
            const section=$(showcaseId);
            const target=section?.querySelector('.brand-showcase-products-head') || section?.querySelector('.brand-showcase-grid');
            if(target){
              const top=target.getBoundingClientRect().top+window.scrollY-96;
              window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
            }
          },180);
        };
      }
    }
  }

  // REGRA SOBERANA DE DISPONIBILIDADE:
  // toda categoria, subcategoria ou marca sem produtos mostra o mesmo aviso
  // visual e, ao ser clicada, conduz o usuário à área de disponibilidade.
  function emptyProductsNotice(){
    return `<span class="empty-product-notice" aria-label="Produtos serão adicionados em breve">Produtos serão adicionados em breve</span>`;
  }

  function optionCardHasProducts(card){
    if(!card) return true;

    if(card.classList.contains('category-card')){
      const key=card.dataset.categoryKey;
      return PRODUCTS.some(p=>p.category===key || (key==='auxiliares' && p.category==='auxiliary'));
    }

    const install=card.dataset.install;
    if(install){
      return PRODUCTS.some(p=>p.category==='digital' && normalize(p.digitalInstall||'')===normalize(install));
    }

    const mech=card.dataset.mechanicalLock;
    if(mech){
      return PRODUCTS.some(p=>p.category==='mechanical' && normalize(p.mechanicalType||'')===normalize(mech));
    }

    const mechDoor=card.dataset.mechanicalDoor;
    if(mechDoor){
      const selectedType=state.mechanicalLockType;
      return PRODUCTS.some(p=>p.category==='mechanical'
        && (!selectedType || normalize(p.mechanicalType||'')===normalize(selectedType))
        && ((Array.isArray(p.mechanicalDoors) && p.mechanicalDoors.some(d=>normalize(d)===normalize(mechDoor)))
            || normalize(p.subcategory||'')===normalize(mechDoor)));
    }

    const accessory=card.dataset.accessorySubcategory;
    if(accessory){
      return PRODUCTS.some(p=>p.category==='accessories' && normalize(p.subcategory||'')===normalize(accessory));
    }

    const hingeMaterial=card.dataset.hingeMaterialSubcategory;
    if(hingeMaterial){
      return PRODUCTS.some(p=>p.category==='hinges' && isHingeMaterial(p, hingeMaterial));
    }

    const hingeCorner=card.dataset.hingeCornerSubcategory;
    if(hingeCorner){
      return PRODUCTS.some(p=>isHingeProduct(p) && normalize(p.hingeCorner||'')===normalize(hingeCorner));
    }

    const hingeSub=card.dataset.hingeSubcategory;
    if(hingeSub){
      return PRODUCTS.some(p=>{
        if(!isHingeProduct(p)) return false;
        if(hingeSub==='Sobrepor') return isHingeSurfaceMount(p);
        if(hingeSub==='Dobradiça de Inox') return !isHingeSurfaceMount(p) && isHingeMaterial(p,'Aço Inox');
        if(hingeSub==='Dobradiça de Aço Carbono') return !isHingeSurfaceMount(p) && isHingeMaterial(p,'Aço Carbono');
        return normalize(p.subcategory||'')===normalize(hingeSub);
      });
    }

    const handleType=card.dataset.handlesType;
    if(handleType){
      return PRODUCTS.some(p=>p.category==='handles' && normalize(p.handleType||'')===normalize(handleType));
    }

    const handleSize=card.dataset.handlesSize;
    if(handleSize){
      return PRODUCTS.some(p=>p.category==='handles' && normalize(p.handleType||'')===normalize(state.handlesType||'') && normalize(p.handleSize||'')===normalize(handleSize));
    }

    const sub=card.dataset.subcategory;
    if(sub){
      const parts=String(sub).split('|');
      if(parts[0]==='Digital'){
        const install=parts[1]||'';
        const door=parts[2]||'';
        return PRODUCTS.some(p=>p.category==='digital'
          && normalize(p.digitalInstall||'')===normalize(install)
          && (!door || normalize(p.digitalDoor||'')===normalize(door)));
      }
      if(parts[0]==='Accessory') return PRODUCTS.some(p=>p.category==='accessories' && normalize(p.subcategory||'')===normalize(parts.slice(1).join('|')));
      if(parts[0]==='Hinge') return PRODUCTS.some(p=>isHingeProduct(p) && normalize(p.subcategory||'')===normalize(parts.slice(1).join('|')));
    }

    return true;
  }

  function decorateEmptyOptionCards(){
    document.querySelectorAll('.category-card, .subcat-card, .digital-show-all, .brand-card').forEach(card=>{
      const had=card.querySelector(':scope > .empty-product-notice');
      const empty=!optionCardHasProducts(card);
      if(empty && !had){
        const badge=document.createElement('span');
        badge.className='empty-product-notice';
        badge.setAttribute('aria-label','Produtos serão adicionados em breve');
        badge.textContent='Produtos serão adicionados em breve';
        card.appendChild(badge);
      }else if(!empty && had){
        had.remove();
      }
      if(empty) bindEmptyCardNavigation(card);
      else card.dataset.emptyNavigationBound='';
    });

    // Marcas sem produtos também recebem o mesmo padrão do aviso.
    const brandChecks=[
      ['dss', typeof isDssBrand==='function' ? PRODUCTS.some(isDssBrand) : false],
      ['virtus', typeof isVirtusBrand==='function' ? PRODUCTS.some(isVirtusBrand) : false],
      ['zen', typeof isZenBrand==='function' ? PRODUCTS.some(isZenBrand) : false],
      ['3f', typeof is3fBrand==='function' ? PRODUCTS.some(is3fBrand) : false],
      ['hafele', typeof isHafeleBrand==='function' ? PRODUCTS.some(isHafeleBrand) : false],
      ['grandcasa', false],
      ['afonte', false],
      ['yale', false]
    ];
    brandChecks.forEach(([key,hasProducts])=>{
      const card=document.querySelector(`[data-brand-partner="${key}"]`);
      if(!card)return;
      const had=card.querySelector(':scope > .empty-product-notice');
      if(!hasProducts && !had){
        const badge=document.createElement('span');
        badge.className='empty-product-notice';
        badge.textContent='Produtos serão adicionados em breve';
        card.appendChild(badge);
      }else if(hasProducts && had){
        had.remove();
      }
      if(!hasProducts) bindEmptyCardNavigation(card);
    });
  }

  function renderDigitalSubcategories(){
    const wrap=$("digitalSubcategories"), grid=$("digitalSubcategoryGrid");
    if(!wrap || !grid) return;
    const isDigital=state.activeCategory==="digital";
    wrap.hidden=!isDigital;
    if(!isDigital){grid.innerHTML=""; state.digitalInstall=""; return;}

    const lang=state.lang;
    setSubcatGuidance("digitalSubcategories", state.digitalInstall ? (lang==="en" ? "Next step: review the products for this application." : "Próxima etapa: confira os produtos desta aplicação.") : (lang==="en" ? "Select an option to continue. Some options open a next step." : "Selecione uma opção para continuar. Algumas opções abrem uma próxima etapa."));
    const selected=$ ("subcategoryFilter").value;
    if(!state.digitalInstall && selected.startsWith("Digital|")){
      state.digitalInstall=selected.split("|")[1] || "";
    }

    const installItems=[
      {key:"Embutir",num:"01",pt:"Embutir",en:"Mortise",descPt:"Fechaduras instaladas embutidas na porta.",descEn:"Locks installed inside the door for a clean finish."},
      {key:"Sobrepor",num:"02",pt:"Sobrepor",en:"Surface Mounted",descPt:"Fechaduras instaladas sobre a superfície da porta.",descEn:"Locks installed on the surface of the door."},
      {key:"Móveis",num:"03",pt:"Fechadura para Móveis",en:"Furniture Locks",descPt:"Fechaduras eletrônicas para armários, gavetas, lockers e móveis.",descEn:"Electronic locks for cabinets, drawers, lockers and furniture."}
    ];

    const doorItems=[
      {door:"Portas de Abrir",num:"01",pt:"Porta de Abrir",en:"Swing Door",cls:"subcat-card--swing",descPt:"Para portas convencionais de abrir.",descEn:"For conventional swing doors.",img:"Todas as Imagens/Fundos e Ambientes/porta-abrir-site.webp"},
      {door:"Portas de Correr",num:"02",pt:"Porta de Correr",en:"Sliding Door",cls:"subcat-card--sliding",descPt:"Para portas deslizantes e projetos contemporâneos.",descEn:"For sliding doors and contemporary projects.",img:"Todas as Imagens/Fundos e Ambientes/porta-de-correr-card.webp"},
      {door:"Portas de Vidro",num:"03",pt:"Porta de Vidro",en:"Glass Door",cls:"subcat-card--glass",descPt:"Para portas de vidro.",descEn:"For glass doors.",img:"Todas as Imagens/Fundos e Ambientes/porta-de-vidro-site.webp"}
    ];

    const installCards=installItems.map(item=>{
      // Usa somente produtos digitais da instalação correspondente como carrossel de fundo.
      const applicationImages = PRODUCTS
        .filter(p=>p.category==="digital" && p.digitalInstall===item.key)
        .map(p=>p.cover)
        .filter(Boolean);

      const backgroundCarousel = applicationImages.length
        ? `<span class="application-bg-carousel" aria-hidden="true">
            ${[...applicationImages,...applicationImages].map(src=>`<img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async">`).join("")}
          </span>`
        : "";

      return `<button type="button" class="subcat-card subcat-install-card${state.digitalInstall===item.key?" active":""}" data-install="${item.key}">
        ${backgroundCarousel}
        <span class="subcat-number">${item.num}</span><h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4><p>${escapeHtml(lang==="en"?item.descEn:item.descPt)}</p>
      </button>`;
    }).join("");

    let doors="";
    if(state.digitalInstall && state.digitalInstall !== "Móveis"){
      doors=`<div class="digital-door-options" aria-label="${lang==="en"?"Choose application type":"Escolha o tipo de aplicação"}">
        <button type="button" class="digital-back-button" data-digital-back aria-label="${lang==="en"?"Back to installation options":"Voltar para as opções de instalação"}">← <span>${lang==="en"?"Back":"Voltar"}</span></button>
        <div class="digital-door-options-head">
          <span>${lang==="en"?"APPLICATION TYPE":"ESCOLHA O TIPO DE APLICAÇÃO"}</span>
        </div>
        <div class="digital-door-grid">${doorItems.map(item=>{
          const key=`Digital|${state.digitalInstall}|${item.door}`;
          const active=selected===key;
          return `<button type="button" class="subcat-card ${item.cls}${active?" active":""}" data-subcategory="${escapeHtml(key)}">
            ${item.img?`<span class="subcat-image" aria-hidden="true"><img src="${escapeHtml(item.img)}" alt="" loading="lazy" decoding="async"></span>`:""}
            <span class="subcat-number">${item.num}</span><h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4><p>${escapeHtml(lang==="en"?item.descEn:item.descPt)}</p>
          </button>`;
        }).join("")}</div>
      </div>`;
    }

    const digitalProducts = PRODUCTS.filter(p=>p.category==="digital");
    const carouselImages = digitalProducts.map(p=>p.cover).filter(Boolean);
    const carouselTrack = carouselImages.length
      ? `<span class="digital-show-all-track" aria-hidden="true">${[...carouselImages,...carouselImages].map(src=>`<img src="${src}" alt="" loading="lazy" decoding="async">`).join("")}</span>`
      : "";
    const showAllButton = `<button type="button" class="digital-show-all" data-show-all aria-label="${lang==="en"?"View all digital lock products":"Ver todos os produtos de fechaduras digitais"}">
      ${carouselTrack}
      <span class="digital-show-all-overlay" aria-hidden="true"></span>
      <span class="digital-show-all-content"><small>${lang==="en"?"DIGITAL LOCKS":"FECHADURAS DIGITAIS"}</small><strong>${lang==="en"?"View all products":"Ver todos os Produtos"}</strong><em>${lang==="en"?"See all digital locks together":"Veja todas as fechaduras digitais juntas"} ↗</em></span>
    </button>`;

    // Primeiro nível: Sobrepor + Embutir lado a lado, com "Ver todos" ocupando toda a largura abaixo.
    // Após escolher uma instalação, o primeiro nível desaparece e entram somente as opções de porta.
    if(state.digitalInstall === "Móveis") {
      const furnitureCount = PRODUCTS.filter(p=>p.category==="digital" && p.digitalInstall==="Móveis").length;
      grid.innerHTML = `<div class="digital-door-options digital-furniture-options">
        <button type="button" class="digital-back-button" data-digital-back aria-label="${lang==="en"?"Back to installation options":"Voltar para as opções de instalação"}">← <span>${lang==="en"?"Back":"Voltar"}</span></button>
        <div class="digital-door-options-head"><span>${lang==="en"?"FURNITURE LOCKS":"FECHADURAS PARA MÓVEIS"}</span></div>
        <div class="digital-furniture-intro"><strong>${lang==="en"?"Electronic locks for furniture":"Fechaduras eletrônicas para móveis"}</strong><span>${lang==="en"?`${furnitureCount} products in this category`:`${furnitureCount} produtos nesta categoria`}</span></div>
      </div>`;
    } else {
      grid.innerHTML = state.digitalInstall
        ? doors
        : `<div class="digital-install-grid"><div class="digital-install-options">${installCards}</div>${showAllButton}</div>`;
    }

    grid.querySelectorAll("[data-digital-back]").forEach(button=>button.onclick=()=>{
      state.digitalInstall="";
      state.activeTag="";
      $("subcategoryFilter").value="";
      renderDigitalSubcategories();
      render();
    });

    grid.querySelectorAll("[data-install]").forEach(card=>card.onclick=()=>{
      state.digitalInstall=card.dataset.install;
      const current=$("subcategoryFilter").value;
      if(state.digitalInstall === "Móveis") {
        $("subcategoryFilter").value="Digital|Móveis";
      } else if(!current.startsWith(`Digital|${state.digitalInstall}|`)) {
        $("subcategoryFilter").value="";
      }
      renderSubcategories();
      renderDigitalSubcategories();
      render();
      if(state.digitalInstall === "Móveis") {
        const destination=$("productGrid");
        if(destination){
          const headerOffset=92;
          const top=destination.getBoundingClientRect().top+window.scrollY-headerOffset;
          window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
        }
      }
    });

    grid.querySelectorAll("[data-show-all]").forEach(button=>button.onclick=()=>{
      // “Ver todos” desta seção abre SOMENTE as fechaduras digitais do site.
      // Não usar showAllCategory, pois essa flag representa o catálogo global.
      state.activeCategory="digital";
      state.digitalInstall="";
      state.menuProductFilter="digital-all";
      state.activeTag="";
      $("searchInput").value="";
      $("brandFilter").value="";
      $("subcategoryFilter").value="";
      $("materialFilter").value="";
      state.showAllCategory=false;
      renderSubcategories();
      renderMaterials();
      renderChips();
      renderMechanicalSubcategories();
      renderDigitalSubcategories();
      renderCategoryShowAll();
      render();

      const destination=$("productGrid");
      if(destination){
        const headerOffset=92;
        const top=destination.getBoundingClientRect().top+window.scrollY-headerOffset;
        window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
      }
    });

    grid.querySelectorAll("[data-subcategory]").forEach(card=>card.onclick=()=>{
      const value=card.dataset.subcategory;
      state.digitalInstall=value.split("|")[1] || state.digitalInstall;
      $("subcategoryFilter").value=value;
      state.activeTag="";
      renderDigitalSubcategories();
      render();
      const destination=$("productGrid");
      if(destination){
        const headerOffset=92;
        const top=destination.getBoundingClientRect().top+window.scrollY-headerOffset;
        window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
      }
    });
    startDigitalApplicationCarousels();
  }

  function startDigitalApplicationCarousels(){
    document.querySelectorAll(".application-bg-carousel").forEach(carousel=>{
      if(carousel.dataset.carouselReady==="1") return;
      const slides=[...carousel.querySelectorAll("img")];
      if(!slides.length) return;
      carousel.dataset.carouselReady="1";
      let index=0;
      slides[0].classList.add("is-active");
      if(slides.length<2) return;
      setInterval(()=>{
        slides[index].classList.remove("is-active");
        index=(index+1)%slides.length;
        slides[index].classList.add("is-active");
      },3200);
    });
  }

  // Componente universal "Ver todos os produtos": reutiliza exatamente o
  // mesmo padrão visual do componente já existente em Fechaduras Digitais.
  // O botão é uma visão global do catálogo e sempre exibe todos os produtos.
  function renderCategoryShowAll(){
    const host=$("categoryShowAllHost");
    if(!host) return;
    const lang=state.lang;
    const categoryKey=state.activeCategory;
    if(!categoryKey || categoryKey==="digital"){
      host.innerHTML="";
      return;
    }

    const isHandlesCategory=categoryKey==="handles";
    const products=PRODUCTS.filter(p=>p.cover && (isHandlesCategory ? p.category==="handles" : !p.strictPlacementOnly));
    const carouselImages=products.map(p=>p.cover).filter(Boolean);
    const carouselTrack=carouselImages.length
      ? `<span class="digital-show-all-track" aria-hidden="true">${[...carouselImages,...carouselImages].map(src=>`<img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async">`).join("")}</span>`
      : `<span class="digital-show-all-track" aria-hidden="true"></span>`;
    host.innerHTML=`<button type="button" class="digital-show-all category-show-all ${isHandlesCategory?"handles-show-all-btn":""}" data-category-show-all aria-label="${isHandlesCategory?"Ver todos os Puxadores":(lang==="en"?"View all products":"Ver todos os produtos")}">
      ${carouselTrack}
      <span class="digital-show-all-overlay" aria-hidden="true"></span>
      <span class="digital-show-all-content"><small>${isHandlesCategory?"PUXADORES":(lang==="en"?"CATALOG":"CATÁLOGO")}</small><strong>${isHandlesCategory?"Ver todos os Puxadores":(lang==="en"?"View all products":"Ver todos os Produtos")}</strong><em>${isHandlesCategory?"Veja todos os puxadores do site":(lang==="en"?"See every product in the catalog":"Veja todos os produtos do catálogo")} ↗</em></span>
    </button>`;

    host.querySelector("[data-category-show-all]")?.addEventListener("click",()=>{
      if(categoryKey==="handles"){
        // Nesta área, “Ver todos os Puxadores” mantém o contexto de Puxadores
        // e mostra exclusivamente todos os puxadores cadastrados no site.
        state.showAllCategory=false;
        state.activeCategory="handles";
        state.handlesType="";
        state.handlesSize="";
        state.activeTag="";
        state.menuProductFilter="handles-all";
        $("subcategoryFilter").value="";
        renderHandlesSubcategories();
        renderCategoryShowAll();
        render();
        const destination=$("productGrid");
        if(destination){const top=destination.getBoundingClientRect().top+window.scrollY-92;window.scrollTo({top:Math.max(0,top),behavior:"smooth"});}
        return;
      }
      // “Ver todos os produtos” é a visão GLOBAL do catálogo.
      state.showAllCategory=true;
      state.activeCategory="";
      state.activeTag="";
      state.menuProductFilter="all";
      state.digitalInstall="";
      state.accessorySubcategory="";
      state.hingeSubcategory="";
      state.hingeMaterialSubcategory="";
      state.mechanicalLockType="";
      state.mechanicalDoor="";
      state.handlesType="";
      state.handlesSize="";
      $("searchInput").value="";
      $("brandFilter").value="";
      $("subcategoryFilter").value="";
      $("materialFilter").value="";
      renderSubcategories();
      renderMaterials();
      renderChips();
      renderMechanicalSubcategories();
      renderDigitalSubcategories();
      renderAccessorySubcategories();
      renderHingeSubcategories();
      render();
      const destination=$("productGrid");
      if(destination){
        const headerOffset=92;
        const top=destination.getBoundingClientRect().top+window.scrollY-headerOffset;
        window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
      }
    });
  }

  function renderMechanicalProductCarousel(){
    const carousel=$("mechanicalProductCarousel");
    const track=$("mechanicalCarouselTrack");
    const showAll=$("mechanicalShowAll");
    if(!carousel || !track) return;
    const isMechanical=state.activeCategory==="mechanical" && !state.mechanicalLockType;
    carousel.hidden=!isMechanical;
    if(state.mechanicalCarouselTimer){clearInterval(state.mechanicalCarouselTimer);state.mechanicalCarouselTimer=null;}
    state.mechanicalCarouselIndex=0;
    track.innerHTML="";
    if(!isMechanical) return;

    const products=PRODUCTS.filter(p=>p.category==="mechanical" && p.cover && !isBlimBlimExterna(p) && !isHato2Externa(p) && p.id!=="fechadura-hato-2-banheiro-inox-55mm-imab" && p.id!=="fechadura-imab-bine-externa-inox" && p.id!=="fechadura-imab-bine-interna-inox");
    if(!products.length){
      carousel.hidden=true;
      return;
    }

    track.innerHTML=products.map((p,i)=>`<div class="mechanical-showcase-slide${i===0?" is-active":""}">
      <img src="${escapeHtml(p.cover)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async">
    </div>`).join("");

    const slides=[...track.querySelectorAll(".mechanical-showcase-slide")];
    let index=0;
    if(slides.length>1){
      state.mechanicalCarouselTimer=setInterval(()=>{
        slides[index].classList.remove("is-active");
        index=(index+1)%slides.length;
        slides[index].classList.add("is-active");
      },3800);
    }

    if(showAll) showAll.onclick=()=>{
      // “Ver todos os produtos” = catálogo GLOBAL.
      state.activeCategory="";
      state.mechanicalLockType="";
      state.mechanicalDoor="";
      state.menuProductFilter="all";
      state.activeTag="";
      state.digitalInstall="";
      state.accessorySubcategory="";
      state.hingeSubcategory="";
      state.hingeMaterialSubcategory="";
      $("searchInput").value="";
      $("brandFilter").value="";
      $("subcategoryFilter").value="";
      $("materialFilter").value="";
      renderSubcategories();renderMaterials();renderChips();
      renderMechanicalSubcategories();renderDigitalSubcategories();renderAccessorySubcategories();renderHingeSubcategories();renderHandlesSubcategories();render();
      const destination=$("productGrid");
      if(destination){const headerOffset=92;const top=destination.getBoundingClientRect().top+window.scrollY-headerOffset;window.scrollTo({top:Math.max(0,top),behavior:"smooth"});}
    };
  }

  function renderMechanicalSubcategories(){
    const wrap=$("mechanicalSubcategories"), grid=$("mechanicalSubcategoryGrid");
    if(!wrap || !grid) return;
    const isMechanical=state.activeCategory==="mechanical";
    wrap.hidden=!isMechanical;
    if(!isMechanical){grid.innerHTML=""; renderMechanicalProductCarousel(); return;}

    const lang=state.lang;
    const heading=wrap.querySelector(".subcat-head h3");

    // Primeiro nível: somente o ambiente da fechadura mecânica.
    const lockItems=[
      {key:"externa",num:"01",pt:"Fechaduras Externas",en:"External Locks",descPt:"Soluções para portas externas e de entrada.",descEn:"Solutions for external and entrance doors."},
      {key:"interna",num:"02",pt:"Fechaduras Internas",en:"Internal Locks",descPt:"Soluções para ambientes internos.",descEn:"Solutions for interior environments."},
      {key:"banheiro",num:"03",pt:"Fechaduras Banheiro",en:"Bathroom Locks",descPt:"Soluções específicas para portas de banheiro.",descEn:"Solutions specifically for bathroom doors."}
    ];

    // Segundo nível: depois de escolher externa, interna ou banheiro,
    // o usuário escolhe o tipo de porta. Todos os produtos mecânicos atuais
    // permanecem em "Portas de Abrir"; as demais opções ficam disponíveis
    // para futuras inclusões sem alterar a classificação atual.
    const doorItems=[
      {key:"Portas de Abrir",num:"01",pt:"Para Porta de Abrir",en:"For Swing Doors",cls:"subcat-card--swing",descPt:"Aplicação para portas de abrir/giro.",descEn:"Application for swing doors.",img:"Todas as Imagens/Fundos e Ambientes/porta-abrir-site.webp"},
      {key:"Portas de Alumínio/Ferro",num:"02",pt:"Para Porta de Alumínio/Ferro",en:"For Aluminum/Iron Doors",cls:"subcat-card--aluminum",descPt:"Aplicação para portas de alumínio ou ferro.",descEn:"Application for aluminum or iron doors.",img:"Todas as Imagens/Fundos e Ambientes/porta-aluminio-ferro-site.webp"},
      {key:"Portas Pivotantes",num:"03",pt:"Para Porta Pivotante",en:"For Pivot Doors",cls:"subcat-card--pivotante",descPt:"Aplicação para portas pivotantes.",descEn:"Application for pivot doors.",img:"Todas as Imagens/Fundos e Ambientes/porta-pivotante-card.webp"},
      {key:"Portas de Vidro",num:"04",pt:"Para Porta de Vidro",en:"For Glass Doors",cls:"subcat-card--glass",descPt:"Aplicação para portas de vidro.",descEn:"Application for glass doors.",img:"Todas as Imagens/Fundos e Ambientes/porta-de-vidro-site.webp"},
      {key:"Portas de Correr",num:"05",pt:"Para Porta de Correr",en:"For Sliding Doors",cls:"subcat-card--sliding",descPt:"Aplicação para portas de correr.",descEn:"Application for sliding doors.",img:"Todas as Imagens/Fundos e Ambientes/porta-de-correr-card.webp"}
    ];

    if(state.mechanicalLockType){
      if(heading) heading.textContent=lang==="en"?"Choose the door type":"Escolha o tipo de porta";
      const selected=lockItems.find(x=>x.key===state.mechanicalLockType);
      const selectedLabel=selected ? (lang==="en"?selected.en:selected.pt) : "";
      const cards=doorItems.map(item=>`<button type="button" class="subcat-card mechanical-door-type-card ${item.cls}${state.mechanicalDoor===item.key?" active":""}" data-mechanical-door="${escapeHtml(item.key)}"><span class="subcat-number">${item.num}</span><h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4><p>${escapeHtml(lang==="en"?item.descEn:item.descPt)}</p></button>`).join("");
      grid.innerHTML=`<div class="mechanical-subcat-breadcrumb"><button type="button" id="mechanicalBackToLockTypes" class="mechanical-subcat-back">← ${lang==="en"?"Back":"Voltar"}</button><span>${escapeHtml(selectedLabel)}</span></div><div class="mechanical-lock-grid mechanical-door-grid">${cards}</div>`;

      const back=$("mechanicalBackToLockTypes");
      if(back) back.onclick=()=>{state.mechanicalLockType="";state.mechanicalDoor="";renderMechanicalSubcategories();render();};
      grid.querySelectorAll("[data-mechanical-door]").forEach(card=>card.onclick=()=>{
        state.mechanicalDoor=card.dataset.mechanicalDoor;
        $("subcategoryFilter").value="";
        state.activeTag="";
        renderMechanicalSubcategories();
        render();
        const destination=$("productGrid");
        if(destination){
          const headerOffset=92;
          const top=destination.getBoundingClientRect().top+window.scrollY-headerOffset;
          window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
        }
      });
      renderMechanicalProductCarousel();
      return;
    }

    if(heading) heading.textContent=lang==="en"?"Choose the lock type":"Escolha o tipo de fechadura";
    const cards=lockItems.map(item=>{
      const imageStyle=item.key==="interna" ? ' style="background-image:url(\"Todas as Imagens/Fundos e Ambientes/porta-interna-site.webp\");background-size:cover;background-position:center center;background-repeat:no-repeat;"' : '';
      return `<button type="button" class="subcat-card mechanical-lock-type-card${item.key==="externa"?" subcat-card--external":item.key==="interna"?" subcat-card--internal":" subcat-card--bathroom"}${state.mechanicalLockType===item.key?" active":""}" data-mechanical-lock="${item.key}"${imageStyle}><span class="subcat-number">${item.num}</span><h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4><p>${escapeHtml(lang==="en"?item.descEn:item.descPt)}</p></button>`;
    }).join("");
    grid.innerHTML=`<div class="mechanical-lock-grid">${cards}</div>`;
    grid.querySelectorAll("[data-mechanical-lock]").forEach(card=>card.onclick=()=>{
      state.mechanicalLockType=card.dataset.mechanicalLock;
      state.mechanicalDoor="";
      $("subcategoryFilter").value="";
      state.activeTag="";
      renderMechanicalSubcategories();
      render();
      const destination=$("mechanicalSubcategories");
      if(destination){
        const headerOffset=92;
        const top=destination.getBoundingClientRect().top+window.scrollY-headerOffset;
        window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
      }
    });
    renderMechanicalProductCarousel();
  }

  function renderAccessorySubcategories(){
    const wrap=$("accessorySubcategories"), grid=$("accessorySubcategoryGrid");
    if(!wrap || !grid) return;
    const isAccessories=state.activeCategory==="accessories";
    wrap.hidden=!isAccessories;
    if(!isAccessories){grid.innerHTML=""; state.accessorySubcategory=""; return;}

    const lang=state.lang;
    setSubcatGuidance("accessorySubcategories", state.hingeSubcategory==="Sobrepor" && !state.hingeMaterialSubcategory ? (lang==="en" ? "Next step: choose the material." : "Próxima etapa: escolha o material.") : (lang==="en" ? "Select an option to continue. Some options open a next step." : "Selecione uma opção para continuar. Algumas opções abrem uma próxima etapa."));
    const selected=$("subcategoryFilter").value;

    if(state.hingeSubcategory==="Sobrepor" && !state.hingeMaterialSubcategory){
      const materialItems=[
        {key:"Aço Inox",num:"01",pt:"Aço Inox",en:"Stainless Steel"},
        {key:"Aço Carbono",num:"02",pt:"Aço Carbono",en:"Carbon Steel"}
      ];
      const cards=materialItems.map(item=>{
        const key=`Hinge|Sobrepor|${item.key}`;
        const active=selected===key || state.hingeMaterialSubcategory===item.key;
        const products=PRODUCTS.filter(p=>!isHingeSurfaceMount(p) && isHingeMaterial(p,"Aço Inox") && normalize(p.hingeCorner||"")===normalize(item.key));
        const image=products.find(p=>p.cover)?.cover;
        const bg=image ? `<span class="accessory-bg" aria-hidden="true"><img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async"></span>` : "";
        return `<button type="button" class="subcat-card accessory-subcat-card hinge-subcat-card${active?" active":""}" data-hinge-material-subcategory="${escapeHtml(item.key)}">${bg}<span class="subcat-number">${item.num}</span><h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4><p>${products.length ? (lang==="en" ? `${products.length} product${products.length>1?"s":""}` : `${products.length} produto${products.length>1?"s":""}`) : (lang==="en"?"Explore this category":"Explorar esta categoria")}</p></button>`;
      }).join("");
      grid.innerHTML=`<div class="accessory-subcat-grid hinge-subcat-grid hinge-material-subcat-grid">${cards}</div>`;
      grid.querySelectorAll("[data-hinge-material-subcategory]").forEach(card=>card.onclick=()=>{
        const sub=card.dataset.hingeMaterialSubcategory;
        state.hingeMaterialSubcategory=sub;
        $("subcategoryFilter").value=`Hinge|Sobrepor|${sub}`;
        state.activeTag="";
        renderHingeSubcategories();
        render();
        const destination=$("productGrid");
        if(destination){const top=destination.getBoundingClientRect().top+window.scrollY-92;window.scrollTo({top:Math.max(0,top),behavior:"smooth"});}
      });
      return;
    }
    const items=[
      {key:"Amortecedores",num:"01",pt:"Amortecedores",en:"Door Stoppers"},
      {key:"Porta de Correr",num:"02",pt:"Porta de Correr",en:"Sliding Door"},
      {key:"Cadeados",num:"03",pt:"Cadeados",en:"Padlocks"},
      {key:"Fechos",num:"04",pt:"Fechos",en:"Latches"},
      {key:"Ferrolho/Trinco",num:"05",pt:"Ferrolho/Trinco",en:"Bolt/Latch"},
      {key:"Guia",num:"06",pt:"Guia",en:"Guide"},
      {key:"Molas",num:"07",pt:"Molas",en:"Door Closer"},
      {key:"Olho Mágico",num:"08",pt:"Olho Mágico",en:"Door Viewer"},
      {key:"Pivôs",num:"09",pt:"Pivôs",en:"Pivots"},
      {key:"Prendedores",num:"10",pt:"Prendedores",en:"Door Holders"},
      {key:"Vedação",num:"11",pt:"Vedação",en:"Sealing"}
    ];
    const cards=items.map(item=>{
      const key=`Accessory|${item.key}`;
      const active=selected===key || state.accessorySubcategory===item.key;
      const products=PRODUCTS.filter(p=>p.category==="accessories" && normalize(p.subcategory||"")===normalize(item.key));
      const image=products.find(p=>p.cover)?.cover;
      const bg=image ? `<span class="accessory-bg" aria-hidden="true"><img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async"></span>` : "";
      return `<button type="button" class="subcat-card accessory-subcat-card${active?" active":""}" data-accessory-subcategory="${escapeHtml(item.key)}">
        ${bg}<span class="subcat-number">${item.num}</span>
        <h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4>
        <p>${products.length ? (lang==="en" ? `${products.length} product${products.length>1?"s":""}` : `${products.length} produto${products.length>1?"s":""}`) : (lang==="en"?"Explore this category":"Explorar esta categoria")}</p>
      </button>`;
    }).join("");
    grid.innerHTML=`<div class="accessory-subcat-grid">${cards}</div>`;
    grid.querySelectorAll("[data-accessory-subcategory]").forEach(card=>card.onclick=()=>{
      const sub=card.dataset.accessorySubcategory;
      state.accessorySubcategory=sub;
      $("subcategoryFilter").value=`Accessory|${sub}`;
      state.activeTag="";
      renderAccessorySubcategories();
      render();
      const destination=$("productGrid");
      if(destination){
        const top=destination.getBoundingClientRect().top+window.scrollY-92;
        window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
      }
    });
  }

  function renderHingeSubcategories(){
    const wrap=$("hingeSubcategories"), grid=$("hingeSubcategoryGrid");
    if(!wrap || !grid) return;
    const isHinges=state.activeCategory==="hinges";
    wrap.hidden=!isHinges;
    if(!isHinges){grid.innerHTML=""; state.hingeSubcategory=""; state.hingeMaterialSubcategory=""; state.hingeCornerSubcategory=""; return;}

    const lang=state.lang;
    const nextText = state.hingeSubcategory==="Dobradiça de Inox" && !state.hingeCornerSubcategory
      ? (lang==="en" ? "Next step: choose the corner type." : "Próxima etapa: escolha o tipo de canto.")
      : state.hingeSubcategory==="Dobradiça de Aço Carbono" && !state.hingeCornerSubcategory
      ? (lang==="en" ? "Next step: choose the corner type." : "Próxima etapa: escolha o tipo de canto.")
      : state.hingeSubcategory==="Sobrepor" && !state.hingeMaterialSubcategory
      ? (lang==="en" ? "Next step: choose the material." : "Próxima etapa: escolha o material.")
      : state.hingeMaterialSubcategory && !state.hingeCornerSubcategory
      ? (lang==="en" ? "Next step: choose the corner type." : "Próxima etapa: escolha o tipo de canto.")
      : (lang==="en" ? "Select an option to continue. Some options open a next step." : "Selecione uma opção para continuar. Algumas opções abrem uma próxima etapa.");
    setSubcatGuidance("hingeSubcategories", nextText);
    const selected=$("subcategoryFilter").value;

    // Segundo nível: ao clicar em Dobradiça de Inox, mostrar Canto Reto e Canto Redondo.
    if(state.hingeSubcategory==="Dobradiça de Inox"){
      const cornerItems=[
        {key:"Canto Reto",num:"01",pt:"Canto Reto",en:"Square Corner"},
        {key:"Canto Redondo",num:"02",pt:"Canto Redondo",en:"Round Corner"}
      ];
      const cards=cornerItems.map(item=>{
        const key=`Hinge|Dobradiça de Inox|${item.key}`;
        const active=selected===key || state.hingeCornerSubcategory===item.key;
        const products=PRODUCTS.filter(p=>!isHingeSurfaceMount(p) && isHingeMaterial(p,"Aço Inox") && normalize(p.hingeCorner||"")===normalize(item.key));
        const image=products.find(p=>p.cover)?.cover;
        const bg=image ? `<span class="accessory-bg" aria-hidden="true"><img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async"></span>` : "";
        return `<button type="button" class="subcat-card accessory-subcat-card hinge-subcat-card${active?" active":""}" data-hinge-corner-subcategory="${escapeHtml(item.key)}">${bg}<span class="subcat-number">${item.num}</span><h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4><p>${products.length ? (lang==="en" ? `${products.length} product${products.length>1?"s":""}` : `${products.length} produto${products.length>1?"s":""}`) : (lang==="en"?"No products yet":"Nenhum produto ainda")}</p></button>`;
      }).join("");

      grid.innerHTML=`<div class="accessory-subcat-grid hinge-subcat-grid hinge-corner-subcat-grid">${cards}</div>`;
      grid.querySelectorAll("[data-hinge-corner-subcategory]").forEach(card=>card.onclick=()=>{
        const sub=card.dataset.hingeCornerSubcategory;
        state.hingeCornerSubcategory=sub;
        $("subcategoryFilter").value=`Hinge|Dobradiça de Inox|${sub}`;
        state.activeTag="";
        renderHingeSubcategories();
        render();
        const destination=$("productGrid");
        if(destination){
          const top=destination.getBoundingClientRect().top+window.scrollY-92;
          window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
        }
      });
      return;
    }

    // Segundo nível: ao clicar em Dobradiça de Aço Carbono, mostrar os cantos.
    if(state.hingeSubcategory==="Dobradiça de Aço Carbono"){
      const cornerItems=[
        {key:"Canto Reto",num:"01",pt:"Canto Reto",en:"Square Corner"},
        {key:"Canto Redondo",num:"02",pt:"Canto Redondo",en:"Round Corner"}
      ];
      const cards=cornerItems.map(item=>{
        const key=`Hinge|Dobradiça de Aço Carbono|${item.key}`;
        const active=selected===key || state.hingeCornerSubcategory===item.key;
        const products=PRODUCTS.filter(p=>{
          const cat=(p.category||"").toLowerCase();
          if(cat!=="hinges" && cat!=="dobradicas" && cat!=="dobradiças") return false;
          const material=normalize(p.material||"");
          const text=normalize(JSON.stringify(p.basic)+" "+JSON.stringify(p.technical)+" "+JSON.stringify(p.name)+" "+JSON.stringify(p.description)+" "+JSON.stringify(p.material)+" "+JSON.stringify(p.subcategory));
          const carbon=material.includes("aço carbono") || material.includes("aco carbono") || text.includes("aço carbono") || text.includes("aco carbono");
          return carbon && normalize(p.hingeCorner||"")===normalize(item.key);
        });
        const image=products.find(p=>p.cover)?.cover;
        const bg=image ? `<span class="accessory-bg" aria-hidden="true"><img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async"></span>` : "";
        return `<button type="button" class="subcat-card accessory-subcat-card hinge-subcat-card${active?" active":""}" data-hinge-corner-subcategory="${escapeHtml(item.key)}">${bg}<span class="subcat-number">${item.num}</span><h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4><p>${products.length ? (lang==="en" ? `${products.length} product${products.length>1?"s":""}` : `${products.length} produto${products.length>1?"s":""}`) : (lang==="en"?"No products yet":"Nenhum produto ainda")}</p></button>`;
      }).join("");
      grid.innerHTML=`<div class="accessory-subcat-grid hinge-subcat-grid hinge-corner-subcat-grid">${cards}</div>`;
      grid.querySelectorAll("[data-hinge-corner-subcategory]").forEach(card=>card.onclick=()=>{
        const sub=card.dataset.hingeCornerSubcategory;
        state.hingeCornerSubcategory=sub;
        $("subcategoryFilter").value=`Hinge|Dobradiça de Aço Carbono|${sub}`;
        state.activeTag="";
        renderHingeSubcategories();
        render();
        const destination=$("productGrid");
        if(destination){
          const top=destination.getBoundingClientRect().top+window.scrollY-92;
          window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
        }
      });
      return;
    }

    // Segundo nível: ao clicar em Dobradiça de Sobrepor, mostrar somente os dois materiais.
    if(state.hingeSubcategory==="Sobrepor" && !state.hingeMaterialSubcategory){
      const materialItems=[
        {key:"Aço Inox",num:"01",pt:"Aço Inox",en:"Stainless Steel"},
        {key:"Aço Carbono",num:"02",pt:"Aço Carbono",en:"Carbon Steel"}
      ];
      const cards=materialItems.map(item=>{
        const key=`Hinge|Sobrepor|${item.key}`;
        const active=selected===key || state.hingeMaterialSubcategory===item.key;
        const products=PRODUCTS.filter(p=>{
          const cat=(p.category||"").toLowerCase();
          if(cat!=="hinges" && cat!=="dobradicas" && cat!=="dobradiças") return false;
          const text=normalize(JSON.stringify(p.basic)+" "+JSON.stringify(p.technical)+" "+JSON.stringify(p.name)+" "+JSON.stringify(p.description)+" "+JSON.stringify(p.material)+" "+JSON.stringify(p.subcategory));
          const material=normalize(p.material||"");
          const materialOk=item.key==="Aço Inox"
            ? (material.includes("inox") || text.includes("inox"))
            : (material.includes("aço carbono") || material.includes("aco carbono") || text.includes("aço carbono") || text.includes("aco carbono"));
          return materialOk && (text.includes("sobrepor") || normalize(p.subcategory||"")===normalize("Sobrepor"));
        });
        const image=products.find(p=>p.cover)?.cover;
        const bg=image ? `<span class="accessory-bg" aria-hidden="true"><img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async"></span>` : "";
        return `<button type="button" class="subcat-card accessory-subcat-card hinge-subcat-card${active?" active":""}" data-hinge-material-subcategory="${escapeHtml(item.key)}">${bg}<span class="subcat-number">${item.num}</span><h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4><p>${products.length ? (lang==="en" ? `${products.length} product${products.length>1?"s":""}` : `${products.length} produto${products.length>1?"s":""}`) : (lang==="en"?"Explore this category":"Explorar esta categoria")}</p></button>`;
      }).join("");

      grid.innerHTML=`<div class="accessory-subcat-grid hinge-subcat-grid hinge-material-subcat-grid">${cards}</div>`;
      grid.querySelectorAll("[data-hinge-material-subcategory]").forEach(card=>card.onclick=()=>{
        const sub=card.dataset.hingeMaterialSubcategory;
        state.hingeMaterialSubcategory=sub;
        $("subcategoryFilter").value=`Hinge|Sobrepor|${sub}`;
        state.activeTag="";
        renderHingeSubcategories();
        render();
        const destination=$("productGrid");
        if(destination){
          const top=destination.getBoundingClientRect().top+window.scrollY-92;
          window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
        }
      });
      return;
    }

    const items=[
      {key:"Hamburguesa",num:"01",pt:"Hamburguesa",en:"Hamburger Hinge",comingSoon:true},
      {key:"Vai & Vem",num:"02",pt:"Vai & Vem",en:"Double Action",comingSoon:true},
      {key:"Sobrepor",num:"03",pt:"Sobrepor",en:"Surface Mount"},
      {key:"Dobradiça de Inox",num:"04",pt:"Dobradiça de Inox",en:"Stainless Steel Hinge"},
      {key:"Dobradiça de Aço Carbono",num:"05",pt:"Dobradiça de Aço Carbono",en:"Carbon Steel Hinge"},
      {key:"Dobradiça Invisível",num:"06",pt:"Dobradiça Invisível",en:"Invisible Hinge",comingSoon:true}
    ];
    const cards=items.map(item=>{
      const key=`Hinge|${item.key}`;
      const active=selected===key || state.hingeSubcategory===item.key;
      const products=PRODUCTS.filter(p=>{
        if(!isHingeProduct(p)) return false;
        if(item.key==="Sobrepor") return isHingeSurfaceMount(p);
        const sub=normalize(p.subcategory||"");
        const material=normalize(p.material||"");
        const name=normalize(p.name||"");
        if(sub===normalize(item.key)) return true;
        if(item.key==="Dobradiça de Inox") return !isHingeSurfaceMount(p) && isHingeMaterial(p,"Aço Inox");
        if(item.key==="Dobradiça de Aço Carbono") return !isHingeSurfaceMount(p) && isHingeMaterial(p,"Aço Carbono");
        return false;
      });
      const image=products.find(p=>p.cover)?.cover;
      const bg=image ? `<span class="accessory-bg" aria-hidden="true"><img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async"></span>` : "";
      const statusText=item.comingSoon
        ? (lang==="en" ? "Products will be added soon" : "Produtos serão adicionados em breve")
        : (products.length
          ? (lang==="en" ? `${products.length} product${products.length>1?"s":""}` : `${products.length} produto${products.length>1?"s":""}`)
          : (lang==="en" ? "Explore this category" : "Explorar esta categoria"));
      return `<button type="button" class="subcat-card accessory-subcat-card hinge-subcat-card${item.comingSoon?" hinge-coming-soon":""}${active?" active":""}" data-hinge-subcategory="${escapeHtml(item.key)}">${bg}<span class="subcat-number">${item.num}</span><h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4><p class="${item.comingSoon?"coming-soon-text":""}">${escapeHtml(statusText)}</p></button>`;
    }).join("");
    grid.innerHTML=`<div class="accessory-subcat-grid hinge-subcat-grid">${cards}</div>`;
    grid.querySelectorAll("[data-hinge-subcategory]").forEach(card=>card.onclick=()=>{
      const sub=card.dataset.hingeSubcategory;
      state.hingeSubcategory=sub;
      state.hingeMaterialSubcategory="";
      state.hingeCornerSubcategory="";
      if(sub==="Dobradiça de Inox"){
        $("subcategoryFilter").value="Hinge|Dobradiça de Inox";
        state.activeTag="";
        renderHingeSubcategories();
        render();
        return;
      }
      if(sub==="Dobradiça de Aço Carbono"){
        $("subcategoryFilter").value="Hinge|Dobradiça de Aço Carbono";
        state.activeTag="";
        renderHingeSubcategories();
        render();
        return;
      }
      if(sub==="Sobrepor"){
        $("subcategoryFilter").value="Hinge|Sobrepor";
        state.activeTag="";
        renderHingeSubcategories();
        render();
        const destination=$("productGrid");
        if(destination){const top=destination.getBoundingClientRect().top+window.scrollY-92;window.scrollTo({top:Math.max(0,top),behavior:"smooth"});}
        return;
      }
      $("subcategoryFilter").value=`Hinge|${sub}`;
      state.activeTag="";
      renderHingeSubcategories();
      render();
      const destination=$("productGrid");
      if(destination){
        const top=destination.getBoundingClientRect().top+window.scrollY-92;
        window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
      }
    });
  }

  function stopHandleTypeCarousels(){
    (state.handleTypeCarouselTimers||[]).forEach(clearInterval);
    state.handleTypeCarouselTimers=[];
  }
  function startHandleTypeCarousels(){
    stopHandleTypeCarousels();
    document.querySelectorAll("[data-type-carousel]").forEach(carousel=>{
      const track=carousel.querySelector(".handles-type-carousel-track");
      const imgs=[...carousel.querySelectorAll("img")];
      if(!track || imgs.length<2) return;
      let index=0;
      // Carrossel suave: as imagens ficam sobrepostas e fazem crossfade,
      // evitando o movimento brusco de deslocamento do trilho.
      track.style.transform="none";
      imgs.forEach((img,i)=>{
        img.classList.toggle("is-active",i===index);
        img.style.zIndex=i===index?2:1;
      });
      const show=()=>{
        imgs.forEach((img,i)=>{
          const active=i===index;
          img.classList.toggle("is-active",active);
          img.style.zIndex=active?2:1;
        });
      };
      show();
      const timer=setInterval(()=>{
        index=(index+1)%imgs.length;
        show();
      },4200);
      state.handleTypeCarouselTimers.push(timer);
    });
  }

  function renderHandlesSubcategories(){
    const wrap=$("handlesSubcategories"), grid=$("handlesSubcategoryGrid");
    if(!wrap || !grid) return;
    const isHandles=state.activeCategory==="handles";
    wrap.hidden=!isHandles;
    if(!isHandles){grid.innerHTML=""; state.handlesType=""; state.handlesSize=""; return;}

    const lang=state.lang, selected=$("subcategoryFilter").value;
    setSubcatGuidance("handlesSubcategories", state.handlesType && !state.handlesSize ? (lang==="en" ? "Next step: choose the size." : "Próxima etapa: escolha o tamanho.") : (lang==="en" ? "Select an option to continue. Some options open a next step." : "Selecione uma opção para continuar. Algumas opções abrem uma próxima etapa."));
    const typeItems=[
      {key:"Tipo H",num:"01",pt:"Tipo H",en:"H Type"},
      {key:"Tipo U",num:"02",pt:"Tipo U",en:"U Type"},
      {key:"Tipo Tubular",num:"03",pt:"Tipo Tubular",en:"Tubular Type"},
      {key:"Concha",num:"04",pt:"Concha",en:"Shell"}
    ];

    if(!state.handlesType){
      const cards=typeItems.map(item=>{
        const products=PRODUCTS.filter(p=>p.category==="handles" && normalize(p.handleType||"")===normalize(item.key) && p.cover);
        const images=[...new Set(products.map(p=>p.cover).filter(Boolean))];
        const slides=images.length ? images.map((src,i)=>`<img src="${escapeHtml(src)}" class="${i===0?"is-active":""}" alt="" loading="lazy" decoding="async">`).join("") : "";
        const carousel=images.length ? `<span class="handles-type-carousel" data-type-carousel="${escapeHtml(item.key)}" aria-hidden="true"><span class="handles-type-carousel-track">${slides}</span><span class="handles-type-carousel-shade"></span></span>` : `<span class="handles-type-carousel handles-type-carousel--empty" aria-hidden="true"></span>`;
        return `<button type="button" class="subcat-card accessory-subcat-card handles-subcat-card handles-type-card" data-handles-type="${escapeHtml(item.key)}">${carousel}<span class="subcat-number">${item.num}</span><span class="handles-type-card-content"><h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4><p>${products.length ? (lang==="en" ? `${products.length} product${products.length>1?"s":""}` : `${products.length} produto${products.length>1?"s":""}`) : (lang==="en"?"Explore this category":"Explore esta categoria")}</p></span></button>`;
      }).join("");
      grid.innerHTML=`<div class="accessory-subcat-grid hinge-subcat-grid handles-subcat-grid handles-type-grid">${cards}</div>`;
      startHandleTypeCarousels();
      grid.querySelectorAll("[data-handles-type]").forEach(card=>card.onclick=()=>{
        state.handlesType=card.dataset.handlesType;
        state.handlesSize="";
        state.activeTag="";
        if(state.handlesType==="Concha") {
          $("subcategoryFilter").value="Handles|Concha";
        } else {
          $("subcategoryFilter").value="";
        }
        renderHandlesSubcategories();
        render();
        // Ao escolher o TIPO, o segundo nível acabou de ser criado acima dos
        // produtos. O scroll deve acompanhar esse novo conteúdo, não saltar
        // diretamente para o fim da seção de produtos.
        const destination=$("handlesSubcategories");
        if(destination){
          requestAnimationFrame(()=>{
            // Ao abrir um tipo, o ponto de referência é SEMPRE o início da
            // seção de Puxadores. Assim o título "PUXADORES" permanece visível
            // junto com as opções recém-abertas, sem saltar para baixo.
            scrollCatalogElement(destination,0);
          });
        }
      });
      return;
    }

    if(state.handlesType==="Concha") {
      const item=typeItems.find(x=>x.key==="Concha");
      const products=PRODUCTS.filter(p=>p.category==="handles" && (normalize(p.handleType||"")===normalize("Concha") || normalize(p.subcategory||"")===normalize("Concha")));
      const image=products.find(p=>p.cover)?.cover;
      const bg=image ? `<span class="accessory-bg" aria-hidden="true"><img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async"></span>` : "";
      grid.innerHTML=`<div class="subcat-head handles-level-head"><p class="eyebrow">${escapeHtml(lang==="en"?item.en:item.pt)}</p><h3>${lang==="en"?"Products":"Produtos"}</h3></div><div class="accessory-subcat-grid hinge-subcat-grid handles-subcat-grid"><button type="button" class="subcat-card accessory-subcat-card handles-subcat-card active" data-handles-back="1">${bg}<span class="subcat-number">←</span><h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4><p>${products.length ? (lang==="en" ? `${products.length} product${products.length>1?"s":""}` : `${products.length} produto${products.length>1?"s":""}`) : (lang==="en"?"No products yet":"Nenhum produto ainda")}</p></button></div>`;
      grid.querySelector("[data-handles-back]").onclick=()=>{state.handlesType="";state.handlesSize="";$("subcategoryFilter").value="";renderHandlesSubcategories();render()};
      return;
    }

    const sizeMap={
      "Tipo H":["30 × 10","40 × 10"],
      "Tipo U":["20 × 10","30 × 15","40 × 20","50 × 20"],
      "Tipo Tubular":[]
    };
    const sizes=sizeMap[state.handlesType]||[];
    if(!sizes.length){
      const item=typeItems.find(x=>x.key===state.handlesType)||typeItems[2];
      const products=PRODUCTS.filter(p=>p.category==="handles" && normalize(p.handleType||"")===normalize(item.key));
      grid.innerHTML=`<div class="handles-level-head"><p class="eyebrow">${escapeHtml(lang==="en"?item.en:item.pt)}</p><h3>${lang==="en"?"Category prepared for future products":"Categoria preparada para receber produtos"}</h3></div><div class="accessory-subcat-grid hinge-subcat-grid handles-subcat-grid"><button type="button" class="subcat-card accessory-subcat-card handles-subcat-card active" data-handles-back="1"><span class="subcat-number">←</span><h4>${escapeHtml(lang==="en"?item.en:item.pt)}</h4><p>${products.length ? (lang==="en" ? `${products.length} product${products.length>1?"s":""}` : `${products.length} produto${products.length>1?"s":""}`) : (lang==="en"?"Products will appear here when added":"Os produtos aparecerão aqui quando forem cadastrados")}</p></button></div>`;
      grid.querySelector("[data-handles-back]").onclick=()=>{state.handlesType="";state.handlesSize="";$("subcategoryFilter").value="";renderHandlesSubcategories();render()};
      return;
    }

    const cards=sizes.map((size,i)=>{
      const products=PRODUCTS.filter(p=>p.category==="handles" && normalize(p.handleType||"")===normalize(state.handlesType) && normalize(p.handleSize||"")===normalize(size));
      const image=products.find(p=>p.cover)?.cover;
      const bg=image ? `<span class="accessory-bg" aria-hidden="true"><img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async"></span>` : "";
      const active=state.handlesSize===size || selected===`Handles|${state.handlesType}|${size}`;
      return `<button type="button" class="subcat-card accessory-subcat-card handles-subcat-card${active?" active":""}" data-handles-size="${escapeHtml(size)}">${bg}<span class="subcat-number">0${i+1}</span><h4>${escapeHtml(size)}</h4><p>${products.length ? (lang==="en" ? `${products.length} product${products.length>1?"s":""}` : `${products.length} produto${products.length>1?"s":""}`) : (lang==="en"?"No products yet":"Nenhum produto ainda")}</p></button>`;
    }).join("");
    const title=typeItems.find(x=>x.key===state.handlesType)?.[lang==="en"?"en":"pt"]||state.handlesType;
    grid.innerHTML=`<div class="subcat-head handles-level-head"><p class="eyebrow">${escapeHtml(title)}</p><h3>${lang==="en"?"Choose the size":"Escolha o tamanho"}</h3></div><div class="accessory-subcat-grid hinge-subcat-grid handles-subcat-grid">${cards}</div>`;
    grid.querySelectorAll("[data-handles-size]").forEach(card=>card.onclick=()=>{
      const size=card.dataset.handlesSize;
      state.handlesSize=size;
      $("subcategoryFilter").value=`Handles|${state.handlesType}|${size}`;
      state.activeTag="";
      renderHandlesSubcategories();
      render();
      // Depois de escolher o tamanho, os produtos filtrados já estão visíveis
      // na grade. Posiciona a grade no início da área correta, respeitando o
      // cabeçalho fixo, sem o salto excessivo anterior.
      const destination=$("productGrid");
      if(destination){
        requestAnimationFrame(()=>{
          const headerOffset=92;
          const top=destination.getBoundingClientRect().top+window.scrollY-headerOffset;
          window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
        });
      }
    });
  }


  // Rolagem de catálogo: posiciona o início real do conteúdo abaixo do cabeçalho fixo,
  // sem cortar o título. O pequeno respiro evita que o heading fique colado no header.
  function scrollCatalogElement(element, extraOffset=18){
    if(!element) return;
    const header=document.querySelector('.site-header');
    const headerHeight=header ? Math.ceil(header.getBoundingClientRect().height) : 92;
    const rect=element.getBoundingClientRect();
    const top=rect.top + window.scrollY - headerHeight - extraOffset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function selectCategory(key){
    state.activeCategory=key;
    state.showAllCategory=false;
    state.menuProductFilter="";
    state.digitalInstall="";
    state.accessorySubcategory="";
    state.hingeSubcategory="";
    state.hingeMaterialSubcategory=""; state.hingeCornerSubcategory="";
    state.handlesType=""; state.handlesSize="";
    state.mechanicalLockType=""; state.mechanicalDoor="";
    $("searchInput").value=""; $("brandFilter").value=""; $("subcategoryFilter").value=""; $("materialFilter").value=""; state.activeTag="";
    renderSubcategories(); renderMaterials(); renderChips(); renderMechanicalSubcategories(); renderDigitalSubcategories(); renderAccessorySubcategories(); renderHingeSubcategories(); renderHandlesSubcategories(); renderCategoryShowAll(); render();
    pushNavigationState("#catalogo",{category:key});
    const target = key==="mechanical" ? $("mechanicalSubcategories") : key==="digital" ? $("digitalSubcategories") : key==="accessories" ? $("accessorySubcategories") : key==="hinges" ? $("hingeSubcategories") : key==="handles" ? $("handlesSubcategories") : $("catalogo");
    scrollCatalogElement(target, key==="handles" ? 0 : 18);
  }

  // Menu Produtos: atalhos para categorias e subcategorias.
  function applyProductsMenuFilter(value){
    state.searchInput = "";
    state.showAllCategory=false;
    state.activeTag = "";
    $("searchInput").value = "";
    $("brandFilter").value = "";
    $("materialFilter").value = "";
    $("subcategoryFilter").value = "";
    state.digitalInstall = "";
    state.accessorySubcategory = "";
    state.mechanicalLockType = "";
    state.mechanicalDoor = "";
    state.menuProductFilter = value;

    if(value === "all") {
      // A área "Produtos" é a visão global: mostrar TODOS os produtos do site.
      // Isso inclui produtos com placement estrito, que continuam restritos
      // nas categorias/subcategorias específicas.
      state.activeCategory = "";
      state.showAllCategory = true;
    } else if(value.startsWith("digital|")) {
      state.activeCategory = "digital";
      state.digitalInstall = value.split("|")[1] || "";
      $("subcategoryFilter").value = `Digital|${state.digitalInstall}`;
    } else if(value === "digital") {
      state.activeCategory = "digital";
    } else if(value === "mechanical") {
      state.activeCategory = "mechanical";
      state.mechanicalLockType = "";
      state.mechanicalDoor = "";
    } else if(value.startsWith("mechanical|")) {
      state.activeCategory = "mechanical";
      state.mechanicalLockType = value.split("|")[1] || "";
    } else {
      state.activeCategory = value;
    }

    renderBrands();
    renderSubcategories();
    renderMaterials();
    renderChips();
    renderMechanicalSubcategories();
    renderDigitalSubcategories();
    renderAccessorySubcategories();
    renderHingeSubcategories();
    renderHandlesSubcategories();
    renderCategoryShowAll();
    render();

    const destination = $("catalogo");
    if(destination) {
      const headerOffset = 92;
      const top = destination.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({top:Math.max(0,top), behavior:"smooth"});
    }
  }

  // Navegação centralizada: cada entrada do histórico guarda o estado completo
  // do catálogo, inclusive filtros e posição de scroll. Novos componentes devem
  // usar estes helpers em vez de criar históricos paralelos.
  const NAV_STATE_VERSION=2;
  const NAV_STATE_KEYS=["activeCategory","digitalInstall","accessorySubcategory","hingeSubcategory","hingeMaterialSubcategory","hingeCornerSubcategory","handlesType","handlesSize","mechanicalLockType","mechanicalDoor","menuProductFilter","activeTag","showAllCategory"];
  function captureNavigationState(){
    const filters={
      search:$("searchInput")?.value||"",
      category:$("categoryFilter")?.value||"",
      brand:$("brandFilter")?.value||"",
      subcategory:$("subcategoryFilter")?.value||"",
      material:$("materialFilter")?.value||"",
      color:$("colorFilter")?.value||""
    };
    const ui={};
    NAV_STATE_KEYS.forEach(k=>ui[k]=state[k]??"");
    return {version:NAV_STATE_VERSION,hash:window.location.hash||"#top",scrollY:window.scrollY||0,filters,ui};
  }
  function restoreNavigationState(snapshot,{scroll=true}={}){
    if(!snapshot)return;
    const ui=snapshot.ui||{};
    NAV_STATE_KEYS.forEach(k=>{if(Object.prototype.hasOwnProperty.call(ui,k)) state[k]=ui[k]});
    const f=snapshot.filters||{};
    if($("searchInput"))$("searchInput").value=f.search||"";
    if($("categoryFilter"))$("categoryFilter").value=f.category||"";
    if($("brandFilter"))$("brandFilter").value=f.brand||"";
    if($("subcategoryFilter"))$("subcategoryFilter").value=f.subcategory||"";
    if($("materialFilter"))$("materialFilter").value=f.material||"";
    if($("colorFilter"))$("colorFilter").value=f.color||"";
    renderCategoryFilter();renderBrands();renderSubcategories();renderMaterials();renderColors();renderChips();
    renderMechanicalSubcategories();renderDigitalSubcategories();renderAccessorySubcategories();
    renderHingeSubcategories();renderHandlesSubcategories();renderCategoryShowAll();render();
    if(scroll){
      const y=Number.isFinite(Number(snapshot.scrollY))?Number(snapshot.scrollY):0;
      requestAnimationFrame(()=>window.scrollTo({top:y,behavior:"auto"}));
    }
  }
  function pushNavigationState(hash=window.location.hash||"#top",extra={}){
    const snapshot=captureNavigationState(); snapshot.hash=hash;
    const current=history.state;
    if(current?.siteNavigation && current?.navigationSnapshot &&
       JSON.stringify(current.navigationSnapshot)===JSON.stringify(snapshot)) return false;
    const depth=(current?.siteNavigation ? Number(current.navigationDepth)||0 : 0)+1;
    history.pushState({siteNavigation:true,...extra,navigationDepth:depth,navigationSnapshot:snapshot}, "", hash);
    syncActiveSiteAreaFromHash(hash);
    pushSiteNavigation(hash);
    return true;
  }
  function replaceNavigationState(hash=window.location.hash||"#top"){
    const snapshot=captureNavigationState(); snapshot.hash=hash;
    const depth=Number(history.state?.navigationDepth)||0;
    history.replaceState({...(history.state||{}),siteNavigation:true,navigationDepth:depth,navigationSnapshot:snapshot}, "", hash);
    syncActiveSiteAreaFromHash(hash);
  }
  function updateNavigationSnapshot(){
    const current=history.state;
    if(current?.siteNavigation){
      const snapshot=captureNavigationState();
      history.replaceState({...current,navigationSnapshot:snapshot},"",snapshot.hash||window.location.hash||"#top");
    }
  }

  // Histórico por áreas: cada grande área da página é uma entrada própria.
  // Assim, ao rolar de uma área para a seguinte, "Voltar" retorna exatamente
  // para a área anterior, preservando também o ponto de scroll.
  const SITE_AREAS=[
    {id:"top",hash:"#top"},
    {id:"atendimento",hash:"#atendimento"},
    {id:"categorias",hash:"#categorias"},
    {id:"catalogo",hash:"#catalogo"},
    {id:"sobre",hash:"#sobre"},
    {id:"marcas-parceiras",hash:"#marcas-parceiras"},
    {id:"qualidade",hash:"#qualidade"},
    {id:"numeros",hash:"#numeros"},
    {id:"orcamento",hash:"#orcamento"}
  ];
  let activeSiteArea="";
  let activeSiteAreaIndex=0;
  let suppressAreaHistoryUntil=0;
  let areaHistoryTimer=0;

  function markProgrammaticAreaNavigation(ms=1100){
    suppressAreaHistoryUntil=Date.now()+ms;
  }

  function getVisibleSiteArea(){
    const headerOffset=(document.querySelector('.site-header')?.getBoundingClientRect().height||92)+18;
    const marker=window.scrollY+headerOffset+Math.min(window.innerHeight*.34,260);
    let current=SITE_AREAS[0];
    SITE_AREAS.forEach(area=>{
      const el=document.getElementById(area.id);
      if(el && !el.hidden && el.offsetTop<=marker) current=area;
    });
    return current;
  }

  function recordScrolledSiteArea(){
    if(Date.now()<suppressAreaHistoryUntil) return;
    const area=getVisibleSiteArea();
    if(!area) return;
    const nextIndex=SITE_AREAS.findIndex(item=>item.hash===area.hash);
    if(nextIndex<0 || nextIndex===activeSiteAreaIndex) return;
    const movingForward=nextIndex>activeSiteAreaIndex;
    if(!movingForward){
      activeSiteArea=area.hash;
      activeSiteAreaIndex=nextIndex;
      return;
    }
    clearTimeout(areaHistoryTimer);
    areaHistoryTimer=setTimeout(()=>{
      if(Date.now()<suppressAreaHistoryUntil) return;
      const startIndex=Math.max(0,activeSiteAreaIndex+1);
      for(let i=startIndex;i<=nextIndex;i++){
        const targetArea=SITE_AREAS[i];
        const el=document.getElementById(targetArea.id);
        const headerH=(document.querySelector('.site-header')?.getBoundingClientRect().height||92);
        const snapshot=captureNavigationState();
        snapshot.hash=targetArea.hash;
        snapshot.scrollY=el ? Math.max(0,el.getBoundingClientRect().top+window.scrollY-headerH) : snapshot.scrollY;
        const current=history.state;
        history.pushState({siteNavigation:true,areaNavigation:true,navigationDepth:(Number(current?.navigationDepth)||0)+1,navigationSnapshot:snapshot},"",targetArea.hash);
        pushSiteNavigation(targetArea.hash);
      }
      activeSiteArea=area.hash;
      activeSiteAreaIndex=nextIndex;
      updateSiteBackButton();
    },90);
  }

  function initSiteAreaHistory(){
    activeSiteArea=(history.state?.navigationSnapshot?.hash || window.location.hash || "#top");
    const initialIndex=SITE_AREAS.findIndex(area=>area.hash===activeSiteArea);
    activeSiteAreaIndex=initialIndex>=0?initialIndex:0;
    window.addEventListener("scroll",recordScrolledSiteArea,{passive:true});
    recordScrolledSiteArea();
  }

  function syncActiveSiteAreaFromHash(hash){
    const idx=SITE_AREAS.findIndex(area=>area.hash===hash);
    if(idx>=0){
      activeSiteArea=hash;
      activeSiteAreaIndex=idx;
    }
  }

  // Histórico interno da navegação: a seta Voltar segue a sequência real do site
  // e nunca fica presa em um ciclo. Se não houver uma entrada interna válida, vai ao Hero.
  const NAV_STACK_KEY="df-site-navigation-stack";
  function readNavStack(){
    try{const v=JSON.parse(sessionStorage.getItem(NAV_STACK_KEY)||"[]"); return Array.isArray(v)?v:[]}catch(e){return []}
  }
  function writeNavStack(stack){try{sessionStorage.setItem(NAV_STACK_KEY,JSON.stringify(stack.slice(-30)))}catch(e){}}
  function ensureNavStack(){
    let stack=readNavStack();
    const current=window.location.hash||"#top";
    if(!stack.length) stack=[current];
    else if(stack[stack.length-1]!==current) stack.push(current);
    writeNavStack(stack);
    return stack;
  }
  function pushSiteNavigation(hash){
    const stack=ensureNavStack();
    if(stack[stack.length-1]!==hash) stack.push(hash);
    writeNavStack(stack);
  }

  // Cada marca aberta a partir da seção Marcas Parceiras ganha sua própria
  // entrada de histórico. Assim, Voltar retorna para Marcas Parceiras exatamente
  // como ela estava, em vez de voltar para a seção anterior do site.
  function pushBrandNavigation(brandKey){
    const snapshot=captureNavigationState();
    snapshot.hash="#marcas-parceiras";
    snapshot.scrollY=Number(window.scrollY)||0;
    snapshot.ui={...(snapshot.ui||{})};
    const current=history.state;
    const depth=(current?.siteNavigation ? Number(current.navigationDepth)||0 : 0)+1;
    // A própria entrada da marca guarda o destino exato de retorno.
    // O botão Voltar usa este snapshot diretamente, sem depender de o navegador
    // ter registrado corretamente a mesma âncora durante a rolagem.
    history.pushState({siteNavigation:true,brandNavigation:brandKey,returnToBrands:true,
      navigationDepth:depth,navigationSnapshot:snapshot},"","#marcas-parceiras");
    pushSiteNavigation("#marcas-parceiras");
    return snapshot;
  }

  // Ao clicar diretamente em "Produtos", sempre mostrar todos os produtos do site.
  const productsMenuTrigger = $("productsMenuTrigger");
  if(productsMenuTrigger){
    productsMenuTrigger.addEventListener("click", event=>{
      event.preventDefault();
      event.stopPropagation();
      applyProductsMenuFilter("all");
      pushNavigationState("#catalogo",{menuFilter:"all"});
      updateSiteBackButton();
    });
  }

  document.querySelectorAll("[data-menu-filter]").forEach(link=>{
    link.addEventListener("click", event=>{
      event.preventDefault();
      event.stopPropagation();
      applyProductsMenuFilter(link.dataset.menuFilter);
      pushNavigationState("#catalogo",{menuFilter:link.dataset.menuFilter});
      updateSiteBackButton();
      document.querySelector(".desktop-nav")?.classList.remove("mobile-open");
    });
  });

  // DESTINO ÚNICO DOS CARDS DE MARCAS: cada vitrine possui um ID exclusivo para o HERO.
  const BRAND_HERO_TARGETS={
    brandShowcaseDss:'hero-marca-dss',
    brandShowcaseZen:'hero-marca-zen',
    brandShowcaseVirtus:'hero-marca-virtuslock',
    brandShowcaseHafele:'hero-marca-hafele',
    brandShowcaseImab:'hero-marca-imab',
    brandShowcasePado:'hero-marca-pado',
    brandShowcaseStam:'hero-marca-stam',
    brandShowcaseHaga:'hero-marca-haga',
    brandShowcaseUniao:'hero-marca-uniao-mundial',
    brandShowcase3f:'hero-marca-3f',
    brandShowcaseAssa:'hero-marca-assa-abloy',
    brandShowcasePapaiz:'hero-marca-papaiz',
    brandShowcaseAfonte:'hero-marca-lafonte',
    brandShowcaseFermax:'hero-marca-fermax',
    brandShowcaseGrandcasa:'hero-marca-grandcasa',
    brandShowcaseYale:'hero-marca-yale',
    brandShowcasePerfil:'hero-marca-perfil',
    brandShowcaseSilvana:'hero-marca-silvana'
  };
  function scrollBrandShowcaseToHero(section){
    const heroId=section?.id ? BRAND_HERO_TARGETS[section.id] : '';
    const hero=heroId ? document.getElementById(heroId) : null;
    if(!hero) return;
    requestAnimationFrame(()=>{
      const header=document.querySelector('.site-header');
      const headerHeight=header?.getBoundingClientRect().height || 92;
      const heroTop=hero.getBoundingClientRect().top + window.scrollY;
      const top=Math.max(0, heroTop-headerHeight);
      window.scrollTo({top,behavior:'smooth'});
    });
  }

  // GRANDCASA — vitrine própria usando o hero banner fornecido pelo cliente.
  function scrollGrandcasaShowcaseToProducts(){
    const target=$("brandGrandcasaProducts");
    if(!target)return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function bindGrandcasaShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseGrandcasa .brand-showcase-scroll');
    if(!button || button.dataset.grandcasaScrollBound==='1')return;
    button.dataset.grandcasaScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollGrandcasaShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openGrandcasaBrandShowcase(){
    const section=$("brandShowcaseGrandcasa");
    if(!section)return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{ if(el!==section)el.hidden=true; });
    section.hidden=false;
    bindGrandcasaShowcaseScroll();

    scrollBrandShowcaseToHero(section);
  }

  function bindGrandcasaBrandCard(){
    const card=document.querySelector('[data-brand-partner="grandcasa"]');
    if(!card || card.dataset.grandcasaBound==='1')return;
    card.dataset.grandcasaBound='1';
    card.addEventListener('click',()=>{
      pushBrandNavigation("grandcasa");
      openGrandcasaBrandShowcase();
    });
    card.addEventListener('keydown',e=>{
      if(e.key!=="Enter" && e.key!==" ")return;
      e.preventDefault();
      pushBrandNavigation("grandcasa");
      openGrandcasaBrandShowcase();
    });
  }

  // YALE — vitrine própria usando exatamente o hero banner fornecido pelo cliente.
  function bindYaleShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseYale .brand-showcase-scroll');
    if(!button || button.dataset.yaleScrollBound==='1')return;
    button.dataset.yaleScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      const target=$("brandYaleProducts");
      if(target){
        const header=document.querySelector('.site-header');
        const offset=(header?.getBoundingClientRect().height||92)+20;
        const top=target.getBoundingClientRect().top+window.scrollY-offset;
        window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
      }
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openYaleBrandShowcase(){
    const section=$("brandShowcaseYale");
    if(!section)return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{ if(el!==section)el.hidden=true; });
    section.hidden=false;
    bindYaleShowcaseScroll();
    scrollBrandShowcaseToHero(section);
  }

  function bindYaleBrandCard(){
    const card=document.querySelector('[data-brand-partner="yale"]');
    if(!card || card.dataset.yaleBound==='1')return;
    card.dataset.yaleBound='1';
    card.addEventListener('click',()=>{
      pushBrandNavigation("yale");
      openYaleBrandShowcase();
    });
    card.addEventListener('keydown',e=>{
      if(e.key!=="Enter" && e.key!==" ")return;
      e.preventDefault();
      pushBrandNavigation("yale");
      openYaleBrandShowcase();
    });
  }

  // LA FONTE — vitrine própria usando o hero banner fornecido pelo cliente.
  function scrollAfonteShowcaseToProducts(){
    const target=$("brandAfonteProducts");
    if(!target)return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function bindAfonteShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseAfonte .brand-showcase-scroll');
    if(!button || button.dataset.afonteScrollBound==='1')return;
    button.dataset.afonteScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollAfonteShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openAfonteBrandShowcase(){
    const section=$("brandShowcaseAfonte");
    const target=$("brandAfonteProducts");
    if(!section)return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{ if(el!==section)el.hidden=true; });
    section.hidden=false;
    bindAfonteShowcaseScroll();

    scrollBrandShowcaseToHero(section);
  }

  function bindAfonteBrandCard(){
    const card=document.querySelector('[data-brand-partner="afonte"]');
    if(!card || card.dataset.afonteBound==='1')return;
    card.dataset.afonteBound='1';
    card.addEventListener('click',()=>{
      pushBrandNavigation("afonte");
      openAfonteBrandShowcase();
    });
    card.addEventListener('keydown',e=>{
      if(e.key!=="Enter" && e.key!==" ")return;
      e.preventDefault();
      pushBrandNavigation("afonte");
      openAfonteBrandShowcase();
    });
  }

  // SILVANA — vitrine própria, seguindo exatamente o padrão das demais marcas.
  function isSilvanaBrand(product){
    const brand=String(product?.brand||'').toLowerCase();
    return brand.includes('silvana');
  }

  function renderSilvanaBrandShowcase(){
    const grid=$("brandSilvanaProductsGrid");
    const count=$("brandSilvanaProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(isSilvanaBrand);
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){
      grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;
      return;
    }
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      const desc=escapeHtml(p.description || "");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button">
        <div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div>
        <div class="card-body"><div class="card-brand">${escapeHtml(p.brand || "SILVANA")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${desc}</p></div>
      </article>`;
    }).join("");
  }

  function scrollSilvanaShowcaseToProducts(){
    const target=$("brandSilvanaProducts");
    if(!target) return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+window.scrollY-offset),behavior:'smooth'});
  }

  function bindSilvanaShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseSilvana .brand-showcase-scroll');
    if(!button || button.dataset.silvanaScrollBound==='1') return;
    button.dataset.silvanaScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollSilvanaShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openSilvanaBrandShowcase(){
    const section=$("brandShowcaseSilvana");
    if(!section) return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{if(el!==section)el.hidden=true;});
    section.hidden=false;
    renderSilvanaBrandShowcase();
    bindSilvanaShowcaseScroll();
    const logo=section.querySelector('.brand-showcase-logo--silvana');
    if(logo){logo.classList.remove('is-entering');void logo.offsetWidth;logo.classList.add('is-entering');window.setTimeout(()=>logo.classList.remove('is-entering'),1050);}
    scrollBrandShowcaseToHero(section);
  }

  function bindSilvanaBrandCard(){
    const card=document.querySelector('[data-brand-partner="silvana"]');
    if(!card || card.dataset.silvanaBound==='1') return;
    card.dataset.silvanaBound='1';
    card.addEventListener('click',()=>{pushBrandNavigation("silvana");openSilvanaBrandShowcase();});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pushBrandNavigation("silvana");openSilvanaBrandShowcase();}});
  }

  // Catalog filters
  function isPerfilBrand(product){
    const brand=String(product?.brand||'').toLowerCase();
    const raw=JSON.stringify(product||{}).toLowerCase();
    return brand.includes('perfil') || brand.includes('perfil rold') || /perfil\s*rold/.test(raw);
  }

  function renderPerfilBrandShowcase(){
    const grid=$("brandPerfilProductsGrid");
    const count=$("brandPerfilProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(isPerfilBrand);
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){
      grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;
      return;
    }
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      const desc=escapeHtml(p.description || "");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button">
        <div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div>
        <div class="card-body"><div class="card-brand">${escapeHtml(p.brand || "PERFIL ROLD")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${desc}</p></div>
      </article>`;
    }).join("");
  }

  function scrollPerfilShowcaseToProducts(){
    const target=$("brandPerfilProducts");
    if(!target) return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function bindPerfilShowcaseScroll(){
    const button=document.querySelector('#brandShowcasePerfil .brand-showcase-scroll');
    if(!button || button.dataset.perfilScrollBound==='1') return;
    button.dataset.perfilScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollPerfilShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openPerfilBrandShowcase(){
    const section=$("brandShowcasePerfil");
    const logo=section?.querySelector('.brand-showcase-logo--perfil');
    if(!section) return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{if(el!==section)el.hidden=true;});
    section.hidden=false;
    renderPerfilBrandShowcase();
    bindPerfilShowcaseScroll();
    if(logo){
      logo.classList.remove('is-entering');
      void logo.offsetWidth;
      logo.classList.add('is-entering');
      window.setTimeout(()=>logo.classList.remove('is-entering'),1050);
    }
    scrollBrandShowcaseToHero(section);
  }

  function bindPerfilBrandCard(){
    const card=document.querySelector('[data-brand-partner="perfil"]');
    if(!card || card.dataset.perfilBound==='1') return;
    card.dataset.perfilBound='1';
    card.addEventListener('click',()=>{pushBrandNavigation("perfil");openPerfilBrandShowcase();});
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){e.preventDefault();pushBrandNavigation("perfil");openPerfilBrandShowcase();}
    });
  }

  function isAssaBrand(product){
    const brand=String(product?.brand||'').toLowerCase().trim();
    // Regra definitiva: produtos identificados como DSs nunca pertencem à Assa Abloy,
    // mesmo que um ID antigo ou caminho de imagem contenha "assa-abloy".
    if(/\bdss\b|dsₛ/.test(brand) || brand.includes("dss")) return false;
    const raw=JSON.stringify(product||{}).toLowerCase();
    return /assa\s*ab(?:loy|loy)?/.test(brand) || /assa\s*abloy/.test(raw);
  }

  function renderAssaBrandShowcase(){
    const grid=$("brandAssaProductsGrid");
    const count=$("brandAssaProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(isAssaBrand);
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){
      grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;
      return;
    }
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      const desc=escapeHtml(p.description || "");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button">
        <div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div>
        <div class="card-body"><div class="card-brand">${escapeHtml(p.brand || "ASSA ABLOY")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${desc}</p></div>
      </article>`;
    }).join("");
  }

  function scrollAssaShowcaseToProducts(){
    const target=$("brandAssaProducts");
    if(!target) return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
  }

  function bindAssaShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseAssa .brand-showcase-scroll');
    if(!button || button.dataset.assaScrollBound==='1') return;
    button.dataset.assaScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollAssaShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openAssaBrandShowcase(){
    const section=$("brandShowcaseAssa");
    const logo=section?.querySelector('.brand-showcase-logo--assa');
    if(!section) return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{if(el!==section)el.hidden=true;});
    section.hidden=false;
    renderAssaBrandShowcase();
    bindAssaShowcaseScroll();
    if(logo){
      logo.classList.remove('is-entering');
      void logo.offsetWidth;
      logo.classList.add('is-entering');
      window.setTimeout(()=>logo.classList.remove('is-entering'),1050);
    }
    scrollBrandShowcaseToHero(section);
  }

  function bindAssaBrandCard(){
    const card=document.querySelector('[data-brand-partner="assa"]');
    if(!card || card.dataset.assaBound==='1') return;
    card.dataset.assaBound='1';
    card.addEventListener('click',()=>{pushBrandNavigation("assa");openAssaBrandShowcase();});
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){e.preventDefault();pushBrandNavigation("assa");openAssaBrandShowcase();}
    });
  }

  function isDssBrand(product){
    // REGRA SOBERANA: todos os puxadores do catálogo pertencem à DSs,
    // mesmo quando nome/descrição antigos mencionarem VIRTUSLOCK.
    // A Blim-Blim também pertence à vitrine DSs e deve aparecer em primeiro.
    if(String(product?.id||'') === 'fechadura-retro-blim-blim-externa') return true;
    if(String(product?.category||'').toLowerCase()==='handles') return true;
    const raw=JSON.stringify(product||{}).toLowerCase();
    return /dss|dsₛ/.test(raw);
  }

  function renderDssBrandShowcase(){
    const grid=$("brandDssProducts");
    const count=$("brandDssProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(isDssBrand).sort((a,b)=>{
      const blimId='fechadura-retro-blim-blim-externa';
      if(a?.id===blimId && b?.id!==blimId) return -1;
      if(b?.id===blimId && a?.id!==blimId) return 1;
      const ah=String(a?.category||'').toLowerCase()==='handles';
      const bh=String(b?.category||'').toLowerCase()==='handles';
      // Todos os puxadores ficam no final da vitrine DSs.
      if(ah!==bh) return ah ? 1 : -1;
      if(!ah) return 0;
      const text=(p)=>[p?.handleSize,p?.name,p?.description,p?.basic?.Tamanho,p?.basic?.Formato].map(v=>String(v||'')).join(' ');
      const dim=(p)=>{
        const m=text(p).match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
        return m ? [Number(m[1].replace(',','.')),Number(m[2].replace(',','.'))] : [-1,-1];
      };
      const len=(p)=>{
        const ms=[...text(p).matchAll(/(\d+(?:[.,]\d+)?)\s*(metros?|m|cm|mm)\b/gi)];
        if(!ms.length)return -1;
        return Math.max(...ms.map(m=>{const n=Number(m[1].replace(',','.'));const u=m[2].toLowerCase();return (u.startsWith('metro')||u==='m')?n*100:u==='mm'?n/10:n;}));
      };
      const da=dim(a), db=dim(b);
      if(da[0]!==db[0]) return db[0]-da[0];
      if(da[1]!==db[1]) return db[1]-da[1];
      return len(b)-len(a);
    });
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      const desc=escapeHtml(p.description || "");
      const extraClasses = [
        "product-card",
        "brand-product-card",
        p.id === "puxador-tipo-u-50x20-2m" || p.id === "puxador-tipo-u-50x20-1-8m" || p.id === "puxador-u-50x20-1-5m" || p.id === "puxador-u-50x20-1-2m" ? "product-card--u50x20" : "",
        p.id === "dobradica-4x3-canto-reto-inox-rolamento-dss" ? "product-card--dobradica-4x3" : "",
        p.id === "dobradica-3-5x2-5-sobrepor-carbono-dss" ? "product-card--dobradica-sobrepor-carbono" : ""
      ].filter(Boolean).join(" ");
      return `<article class="${extraClasses}" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button">
        <div class="card-media" style="--card-photo:url("${image}")"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div>
        <div class="card-body">
          <div class="card-brand">${escapeHtml(p.brand || "DSs")}</div>
          <h3 class="card-title">${escapeHtml(p.name)}</h3>
          <p class="card-desc">${desc}</p>
        </div>
      </article>`;
    }).join("");
    grid.querySelectorAll(".brand-product-card .card-media img").forEach(img=>{
      img.addEventListener("load",()=>{
        if(img.naturalHeight>img.naturalWidth*1.12) img.closest(".card-media")?.classList.add("card-media--portrait");
      },{once:true});
    });
  }

  function scrollDssShowcaseToProducts(){
    const target=$("brandDssProducts");
    if(!target) return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function bindDssShowcaseScroll(){
    const button=document.querySelector('.brand-showcase-scroll');
    if(!button || button.dataset.dssScrollBound==='1') return;
    button.dataset.dssScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollDssShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openDssBrandShowcase(){
    const section=$("brandShowcaseDss");
    const logo=$("brandShowcaseDss")?.querySelector('.brand-showcase-logo');
    if(!section) return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{ if(el!==section) el.hidden=true; });
    section.hidden=false;
    renderDssBrandShowcase();
    bindDssShowcaseScroll();
    if(logo){
      logo.classList.remove('is-entering');
      void logo.offsetWidth;
      logo.classList.add('is-entering');
      window.setTimeout(()=>logo.classList.remove('is-entering'),1050);
    }
    scrollBrandShowcaseToHero(section);
  }

  function bindDssBrandCard(){
    const card=document.querySelector('[data-brand-partner="dss"]');
    if(!card || card.dataset.dssBound==='1') return;
    card.dataset.dssBound='1';
    card.addEventListener('click',()=>{pushBrandNavigation("dss");openDssBrandShowcase();});
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){e.preventDefault();pushBrandNavigation("dss");openDssBrandShowcase();}
    });
  }

  function isVirtusBrand(product){
    // Puxadores pertencem exclusivamente à DSs; nunca exibir na área VIRTUS LOCK.
    if(String(product?.category||'').toLowerCase()==='handles') return false;
    const brand=String(product?.brand||'').toLowerCase();
    return /virtus\s*lock/.test(brand);
  }

  function renderVirtusBrandShowcase(){
    const grid=$("brandVirtusProductsGrid");
    const count=$("brandVirtusProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(isVirtusBrand);
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){
      grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;
      return;
    }
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      const desc=escapeHtml(p.description || "");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button">
        <div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div>
        <div class="card-body"><div class="card-brand">${escapeHtml(p.brand || "VIRTUS LOCK")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${desc}</p></div>
      </article>`;
    }).join("");
  }

  function scrollVirtusShowcaseToProducts(){
    const target=$("brandVirtusProducts");
    if(!target) return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function bindVirtusShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseVirtus .brand-showcase-scroll');
    if(!button || button.dataset.virtusScrollBound==='1') return;
    button.dataset.virtusScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollVirtusShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openVirtusBrandShowcase(){
    const section=$("brandShowcaseVirtus");
    const logo=section?.querySelector('.brand-showcase-logo');
    if(!section) return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{ if(el!==section) el.hidden=true; });
    section.hidden=false;
    renderVirtusBrandShowcase();
    bindVirtusShowcaseScroll();
    if(logo){
      logo.classList.remove('is-entering');
      void logo.offsetWidth;
      logo.classList.add('is-entering');
      window.setTimeout(()=>logo.classList.remove('is-entering'),1050);
    }
    scrollBrandShowcaseToHero(section);
  }

  function bindVirtusBrandCard(){
    const card=document.querySelector('[data-brand-partner="virtus"]');
    if(!card || card.dataset.virtusBound==='1') return;
    card.dataset.virtusBound='1';
    card.addEventListener('click',()=>{pushBrandNavigation("virtus");openVirtusBrandShowcase();});
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){e.preventDefault();pushBrandNavigation("virtus");openVirtusBrandShowcase();}
    });
  }

  function isPapaizBrand(product){
    const brand=String(product?.brand||'').toLowerCase();
    const raw=JSON.stringify(product||{}).toLowerCase();
    return brand.includes('papaiz') || /\bpapaiz\b/.test(raw);
  }

  function renderPapaizBrandShowcase(){
    const grid=$("brandPapaizProductsGrid");
    const count=$("brandPapaizProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(isPapaizBrand);
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){
      grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;
      return;
    }
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      const desc=escapeHtml(p.description || "");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button">
        <div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div>
        <div class="card-body"><div class="card-brand">${escapeHtml(p.brand || "PAPAIZ")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${desc}</p></div>
      </article>`;
    }).join("");
  }

  function scrollPapaizShowcaseToProducts(){
    const target=$("brandPapaizProducts");
    if(!target) return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function bindPapaizShowcaseScroll(){
    const button=document.querySelector('#brandShowcasePapaiz .brand-showcase-scroll');
    if(!button || button.dataset.papaizScrollBound==='1') return;
    button.dataset.papaizScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollPapaizShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openPapaizBrandShowcase(){
    const section=$("brandShowcasePapaiz");
    const logo=section?.querySelector('.brand-showcase-logo--papaiz');
    if(!section) return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{if(el!==section)el.hidden=true;});
    section.hidden=false;
    renderPapaizBrandShowcase();
    bindPapaizShowcaseScroll();
    if(logo){
      logo.classList.remove('is-entering');
      void logo.offsetWidth;
      logo.classList.add('is-entering');
      window.setTimeout(()=>logo.classList.remove('is-entering'),1050);
    }
    scrollBrandShowcaseToHero(section);
  }

  function bindPapaizBrandCard(){
    const card=document.querySelector('[data-brand-partner="papaiz"]');
    if(!card || card.dataset.papaizBound==='1') return;
    card.dataset.papaizBound='1';
    card.addEventListener('click',()=>{pushBrandNavigation("papaiz");openPapaizBrandShowcase();});
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){e.preventDefault();pushBrandNavigation("papaiz");openPapaizBrandShowcase();}
    });
  }

  function isFermaxBrand(product){
    const brand=String(product?.brand||'').toLowerCase();
    const raw=JSON.stringify(product||{}).toLowerCase();
    return brand.includes('fermax') || /\bfermax\b/.test(raw);
  }

  function renderFermaxBrandShowcase(){
    const grid=$("brandFermaxProductsGrid");
    const count=$("brandFermaxProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(isFermaxBrand);
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){
      grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;
      return;
    }
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      const desc=escapeHtml(p.description || "");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button">
        <div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div>
        <div class="card-body"><div class="card-brand">${escapeHtml(p.brand || "FERMAX")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${desc}</p></div>
      </article>`;
    }).join("");
  }

  function scrollFermaxShowcaseToProducts(){
    const target=$("brandFermaxProducts");
    if(!target) return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function bindFermaxShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseFermax .brand-showcase-scroll');
    if(!button || button.dataset.fermaxScrollBound==='1') return;
    button.dataset.fermaxScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollFermaxShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openFermaxBrandShowcase(){
    const section=$("brandShowcaseFermax");
    const logo=section?.querySelector('.brand-showcase-logo--fermax');
    if(!section) return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{if(el!==section)el.hidden=true;});
    section.hidden=false;
    renderFermaxBrandShowcase();
    bindFermaxShowcaseScroll();
    if(logo){
      logo.classList.remove('is-entering');
      void logo.offsetWidth;
      logo.classList.add('is-entering');
      window.setTimeout(()=>logo.classList.remove('is-entering'),1050);
    }
    scrollBrandShowcaseToHero(section);
  }

  function bindFermaxBrandCard(){
    const card=document.querySelector('[data-brand-partner="fermax"]');
    if(!card || card.dataset.fermaxBound==='1') return;
    card.dataset.fermaxBound='1';
    card.addEventListener('click',()=>{pushBrandNavigation("fermax");openFermaxBrandShowcase();});
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){e.preventDefault();pushBrandNavigation("fermax");openFermaxBrandShowcase();}
    });
  }

  function isHafeleBrand(product){
    const brand=String(product?.brand||'').toLowerCase();
    const raw=JSON.stringify(product||{}).toLowerCase();
    return brand.includes('hafele') || brand.includes('häfele') || /hä?fele/.test(raw);
  }

  function renderHafeleBrandShowcase(){
    const grid=$("brandHafeleProductsGrid");
    const count=$("brandHafeleProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(isHafeleBrand);
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){
      grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;
      return;
    }
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      const desc=escapeHtml(p.description || "");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button">
        <div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div>
        <div class="card-body"><div class="card-brand">${escapeHtml(p.brand || "Häfele")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${desc}</p></div>
      </article>`;
    }).join("");
  }

  function scrollHafeleShowcaseToProducts(){
    const section=$("brandShowcaseHafele");
    if(!section) return;
    const target=$("brandHafeleProducts") || section.querySelector('.brand-showcase-products-head') || section.querySelector('.brand-showcase-hero');
    if(!target) return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function bindHafeleShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseHafele .brand-showcase-scroll');
    if(!button || button.dataset.hafeleScrollBound==='1') return;
    button.dataset.hafeleScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollHafeleShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openHafeleBrandShowcase(){
    const section=$("brandShowcaseHafele");
    const logo=section?.querySelector('.brand-showcase-logo--hafele');
    if(!section) return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{ if(el!==section) el.hidden=true; });
    section.hidden=false;
    renderHafeleBrandShowcase();
    bindHafeleShowcaseScroll();
    if(logo){
      logo.classList.remove('is-entering');
      void logo.offsetWidth;
      logo.classList.add('is-entering');
      window.setTimeout(()=>logo.classList.remove('is-entering'),1050);
    }
    scrollBrandShowcaseToHero(section);
  }

  function bindHafeleBrandCard(){
    const card=document.querySelector('[data-brand-partner="hafele"]');
    if(!card || card.dataset.hafeleBound==='1') return;
    card.dataset.hafeleBound='1';
    card.addEventListener('click',()=>{pushBrandNavigation("hafele");openHafeleBrandShowcase();});
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){e.preventDefault();pushBrandNavigation("hafele");openHafeleBrandShowcase();}
    });
  }

  function isImabBrand(product){
    const brand=String(product?.brand||'').toLowerCase();
    const raw=JSON.stringify(product||'').toLowerCase();
    return brand.includes('imab') || /\bimab\b/.test(raw);
  }

  function renderImabBrandShowcase(){
    const grid=$("brandImabProductsGrid");
    const count=$("brandImabProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(isImabBrand);
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){
      grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;
      return;
    }
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      const desc=escapeHtml(p.description || "");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button">
        <div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div>
        <div class="card-body"><div class="card-brand">${escapeHtml(p.brand || "IMAB")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${desc}</p></div>
      </article>`;
    }).join("");
  }

  function scrollImabShowcaseToProducts(){
    const target=$("brandImabProducts");
    if(!target) return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function bindImabShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseImab .brand-showcase-scroll');
    if(!button || button.dataset.imabScrollBound==='1') return;
    button.dataset.imabScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollImabShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openImabBrandShowcase(){
    const section=$("brandShowcaseImab");
    const logo=section?.querySelector('.brand-showcase-logo');
    if(!section) return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{ if(el!==section) el.hidden=true; });
    section.hidden=false;
    renderImabBrandShowcase();
    bindImabShowcaseScroll();
  bindPadoShowcaseScroll();
    if(logo){
      logo.classList.remove('is-entering');
      void logo.offsetWidth;
      logo.classList.add('is-entering');
      window.setTimeout(()=>logo.classList.remove('is-entering'),1050);
    }
    scrollBrandShowcaseToHero(section);
  }

  function bindImabBrandCard(){
    const card=document.querySelector('[data-brand-partner="imab"]');
    if(!card || card.dataset.imabBound==='1') return;
    card.dataset.imabBound='1';
    card.addEventListener('click',()=>{pushBrandNavigation("imab");openImabBrandShowcase();});
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){e.preventDefault();pushBrandNavigation("imab");openImabBrandShowcase();}
    });
  }

  function isStamBrand(product){
    const brand=String(product?.brand||'').toLowerCase();
    const raw=JSON.stringify(product||{}).toLowerCase();
    return brand.includes('stam') || /\bstam\b/.test(raw);
  }
  function renderStamBrandShowcase(){
    const grid=$("brandStamProductsGrid"),count=$("brandStamProductCount");
    if(!grid)return;
    const products=PRODUCTS.filter(isStamBrand);
    if(count)count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;return;}
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover||(Array.isArray(p.images)?p.images[0]:"")||"");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button"><div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div><div class="card-body"><div class="card-brand">${escapeHtml(p.brand||"STAM")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${escapeHtml(p.description||"")}</p></div></article>`;
    }).join("");
  }
  function scrollStamShowcaseToProducts(){
    const target=$("brandStamProducts");if(!target)return;
    const header=document.querySelector('.site-header');const offset=(header?.getBoundingClientRect().height||92)+20;
    window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+window.scrollY-offset),behavior:'smooth'});
  }
  function bindStamShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseStam .brand-showcase-scroll');if(!button||button.dataset.stamScrollBound==='1')return;
    button.dataset.stamScrollBound='1';button.addEventListener('click',()=>{button.classList.add('is-scrolling');scrollStamShowcaseToProducts();window.setTimeout(()=>button.classList.remove('is-scrolling'),750);});
  }
  function openStamBrandShowcase(){
    const section=$("brandShowcaseStam");if(!section)return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{if(el!==section)el.hidden=true;});section.hidden=false;
    renderStamBrandShowcase();bindStamShowcaseScroll();
    const logo=section.querySelector('.brand-showcase-logo--stam');
    if(logo){logo.classList.remove('is-entering');void logo.offsetWidth;logo.classList.add('is-entering');window.setTimeout(()=>logo.classList.remove('is-entering'),1050);}
    scrollBrandShowcaseToHero(section);
  }
  function bindStamBrandCard(){
    const card=document.querySelector('[data-brand-partner="stam"]');if(!card||card.dataset.stamBound==='1')return;
    card.dataset.stamBound='1';card.addEventListener('click',()=>{pushBrandNavigation("stam");openStamBrandShowcase();});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pushBrandNavigation("stam");openStamBrandShowcase();}});
  }

  function isUniaoBrand(product){
    const brand=String(product?.brand||'').toLowerCase();
    const raw=JSON.stringify(product||{}).toLowerCase();
    return brand.includes('união mundial') || brand.includes('uniao mundial') || /uni[aã]o mundial/.test(raw);
  }
  function renderUniaoBrandShowcase(){
    const grid=$("brandUniaoProductsGrid"),count=$("brandUniaoProductCount");
    if(!grid)return;
    const products=PRODUCTS.filter(isUniaoBrand);
    if(count)count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;return;}
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover||(Array.isArray(p.images)?p.images[0]:"")||"");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button"><div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div><div class="card-body"><div class="card-brand">${escapeHtml(p.brand||"UNIÃO MUNDIAL")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${escapeHtml(p.description||"")}</p></div></article>`;
    }).join("");
  }
  function scrollUniaoShowcaseToProducts(){
    const target=$("brandUniaoProducts");if(!target)return;
    const header=document.querySelector('.site-header');const offset=(header?.getBoundingClientRect().height||92)+20;
    window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+window.scrollY-offset),behavior:'smooth'});
  }
  function bindUniaoShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseUniao .brand-showcase-scroll');if(!button||button.dataset.uniaoScrollBound==='1')return;
    button.dataset.uniaoScrollBound='1';button.addEventListener('click',()=>{button.classList.add('is-scrolling');scrollUniaoShowcaseToProducts();window.setTimeout(()=>button.classList.remove('is-scrolling'),750);});
  }
  function openUniaoBrandShowcase(){
    const section=$("brandShowcaseUniao");if(!section)return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{if(el!==section)el.hidden=true;});section.hidden=false;
    renderUniaoBrandShowcase();bindUniaoShowcaseScroll();
    const logo=section.querySelector('.brand-showcase-logo--uniao');
    if(logo){logo.classList.remove('is-entering');void logo.offsetWidth;logo.classList.add('is-entering');window.setTimeout(()=>logo.classList.remove('is-entering'),1050);}
    scrollBrandShowcaseToHero(section);
  }
  function bindUniaoBrandCard(){
    const card=document.querySelector('[data-brand-partner="uniao"]');if(!card||card.dataset.uniaoBound==='1')return;
    card.dataset.uniaoBound='1';card.addEventListener('click',()=>{pushBrandNavigation("uniao");openUniaoBrandShowcase();});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pushBrandNavigation("uniao");openUniaoBrandShowcase();}});
  }

  function is3fBrand(product){
    const raw=JSON.stringify(product||'').toLowerCase();
    return /\b3\s*f\b|\b3f\b/.test(raw);
  }

  function render3fBrandShowcase(){
    const grid=$("brand3fProductsGrid");
    const count=$("brand3fProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(is3fBrand);
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){
      grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;
      return;
    }
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      const desc=escapeHtml(p.description || "");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button">
        <div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div>
        <div class="card-body"><div class="card-brand">${escapeHtml(p.brand || "3F")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${desc}</p></div>
      </article>`;
    }).join("");
  }

  function scroll3fShowcaseToProducts(){
    const target=$("brand3fProductsGrid")?.closest(".brand-showcase-products-head");
    if(!target) return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function bind3fShowcaseScroll(){
    const button=document.querySelector('#brandShowcase3f .brand-showcase-scroll');
    if(!button || button.dataset.threefScrollBound==='1') return;
    button.dataset.threefScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scroll3fShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function open3fBrandShowcase(){
    const section=$("brandShowcase3f");
    const logo=section?.querySelector('.brand-showcase-3f-wordmark');
    if(!section) return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{ if(el!==section) el.hidden=true; });
    section.hidden=false;
    render3fBrandShowcase();
    bind3fShowcaseScroll();
    if(logo){
      logo.classList.remove('is-entering');
      void logo.offsetWidth;
      logo.classList.add('is-entering');
      window.setTimeout(()=>logo.classList.remove('is-entering'),1050);
    }
    scrollBrandShowcaseToHero(section);
  }

  function bind3fBrandCard(){
    const card=document.querySelector('[data-brand-partner="3f"]');
    if(!card || card.dataset.threefBound==='1') return;
    card.dataset.threefBound='1';
    card.addEventListener('click',()=>{pushBrandNavigation("3f");open3fBrandShowcase();});
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){e.preventDefault();pushBrandNavigation("3f");open3fBrandShowcase();}
    });
  }

  function isHagaBrand(product){
    const brand=String(product?.brand||'').toLowerCase();
    const raw=JSON.stringify(product||'').toLowerCase();
    return brand.includes('haga') || /\bhaga\b/.test(raw);
  }

  function renderHagaBrandShowcase(){
    const grid=$("brandHagaProductsGrid");
    const count=$("brandHagaProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(isHagaBrand);
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){
      grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;
      return;
    }
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      const desc=escapeHtml(p.description || "");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button">
        <div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div>
        <div class="card-body"><div class="card-brand">${escapeHtml(p.brand || "HAGA")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${desc}</p></div>
      </article>`;
    }).join("");
  }

  function scrollHagaShowcaseToProducts(){
    const target=$("brandHagaProducts");
    if(!target) return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function bindHagaShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseHaga .brand-showcase-scroll');
    if(!button || button.dataset.hagaScrollBound==='1') return;
    button.dataset.hagaScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollHagaShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openHagaBrandShowcase(){
    const section=$("brandShowcaseHaga");
    const logo=section?.querySelector('.brand-showcase-logo--haga');
    if(!section) return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{ if(el!==section) el.hidden=true; });
    section.hidden=false;
    renderHagaBrandShowcase();
    bindHagaShowcaseScroll();
    if(logo){
      logo.classList.remove('is-entering');
      void logo.offsetWidth;
      logo.classList.add('is-entering');
      window.setTimeout(()=>logo.classList.remove('is-entering'),1050);
    }
    scrollBrandShowcaseToHero(section);
  }

  function bindHagaBrandCard(){
    const card=document.querySelector('[data-brand-partner="haga"]');
    if(!card || card.dataset.hagaBound==='1') return;
    card.dataset.hagaBound='1';
    card.addEventListener('click',()=>{pushBrandNavigation("haga");openHagaBrandShowcase();});
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){e.preventDefault();pushBrandNavigation("haga");openHagaBrandShowcase();}
    });
  }

  function isPadoBrand(product){
    const brand=String(product?.brand||'').toLowerCase();
    const raw=JSON.stringify(product||'').toLowerCase();
    return brand.includes('pado') || /\bpado\b/.test(raw);
  }

  function renderPadoBrandShowcase(){
    const grid=$("brandPadoProductsGrid"), count=$("brandPadoProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(isPadoBrand);
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){ grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`; return; }
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button"><div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div><div class="card-body"><div class="card-brand">${escapeHtml(p.brand||"PADO")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${escapeHtml(p.description||"")}</p></div></article>`;
    }).join("");
  }
  function scrollPadoShowcaseToProducts(){
    const target=$("brandPadoProducts"); if(!target)return;
    const header=document.querySelector('.site-header'); const offset=(header?.getBoundingClientRect().height||92)+20;
    window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+window.scrollY-offset),behavior:'smooth'});
  }
  function bindPadoShowcaseScroll(){
    const button=document.querySelector('#brandShowcasePado .brand-showcase-scroll'); if(!button||button.dataset.padoScrollBound==='1')return;
    button.dataset.padoScrollBound='1'; button.addEventListener('click',()=>{button.classList.add('is-scrolling');scrollPadoShowcaseToProducts();window.setTimeout(()=>button.classList.remove('is-scrolling'),750);});
  }
  function openPadoBrandShowcase(){
    const section=$("brandShowcasePado"); if(!section)return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{if(el!==section)el.hidden=true;}); section.hidden=false;
    renderPadoBrandShowcase(); bindPadoShowcaseScroll();
    const logo=section.querySelector('.brand-showcase-logo--pado');
    if(logo){logo.classList.remove('is-entering');void logo.offsetWidth;logo.classList.add('is-entering');window.setTimeout(()=>logo.classList.remove('is-entering'),1050);}
    scrollBrandShowcaseToHero(section);
  }
  function bindPadoBrandCard(){
    const card=document.querySelector('[data-brand-partner="pado"]'); if(!card||card.dataset.padoBound==='1')return;
    card.dataset.padoBound='1'; card.addEventListener('click',()=>{pushBrandNavigation("pado");openPadoBrandShowcase();}); card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pushBrandNavigation("pado");openPadoBrandShowcase();}});
  }

  function isZenBrand(product){
    const raw=JSON.stringify(product||'').toLowerCase();
    return /\bzen\b/.test(raw);
  }

  function renderZenBrandShowcase(){
    const grid=$("brandZenProductsGrid");
    const count=$("brandZenProductCount");
    if(!grid) return;
    const products=PRODUCTS.filter(isZenBrand);
    if(count) count.textContent=`${products.length} ${products.length===1?"PRODUTO":"PRODUTOS"}`;
    if(!products.length){
      grid.innerHTML=`<div class="brand-showcase-empty">Produtos serão adicionados em breve.</div>`;
      return;
    }
    grid.innerHTML=products.map(p=>{
      const image=escapeHtml(p.cover || (Array.isArray(p.images)?p.images[0]:"") || "");
      const desc=escapeHtml(p.description || "");
      return `<article class="product-card brand-product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0" role="button">
        <div class="card-media"><img loading="lazy" decoding="async" src="${image}" alt="${escapeHtml(p.name)}" draggable="false"></div>
        <div class="card-body"><div class="card-brand">${escapeHtml(p.brand || "ZEN")}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${desc}</p></div>
      </article>`;
    }).join("");
  }

  function scrollZenShowcaseToProducts(){
    const target=$("brandZenProducts");
    if(!target) return;
    const header=document.querySelector('.site-header');
    const offset=(header?.getBoundingClientRect().height||92)+20;
    const top=target.getBoundingClientRect().top+window.scrollY-offset;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }

  function bindZenShowcaseScroll(){
    const button=document.querySelector('#brandShowcaseZen .brand-showcase-scroll');
    if(!button || button.dataset.zenScrollBound==='1') return;
    button.dataset.zenScrollBound='1';
    button.addEventListener('click',()=>{
      button.classList.add('is-scrolling');
      scrollZenShowcaseToProducts();
      window.setTimeout(()=>button.classList.remove('is-scrolling'),750);
    });
  }

  function openZenBrandShowcase(){
    const section=$("brandShowcaseZen");
    const logo=section?.querySelector('.brand-showcase-logo');
    if(!section) return;
    document.querySelectorAll('.brand-showcase').forEach(el=>{ if(el!==section) el.hidden=true; });
    section.hidden=false;
    renderZenBrandShowcase();
    bindZenShowcaseScroll();
    if(logo){
      logo.classList.remove('is-entering');
      void logo.offsetWidth;
      logo.classList.add('is-entering');
      window.setTimeout(()=>logo.classList.remove('is-entering'),1050);
    }
    scrollBrandShowcaseToHero(section);
  }

  function bindZenBrandCard(){
    const card=document.querySelector('[data-brand-partner="zen"]');
    if(!card || card.dataset.zenBound==='1') return;
    card.dataset.zenBound='1';
    card.addEventListener('click',()=>{pushBrandNavigation("zen");openZenBrandShowcase();});
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){e.preventDefault();pushBrandNavigation("zen");openZenBrandShowcase();}
    });
  }

  $("brandVirtusProductsGrid")?.addEventListener("click",e=>{
    const card=e.target.closest(".brand-product-card");
    if(!card) return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandVirtusProductsGrid")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ") return;
    const card=e.target.closest(".brand-product-card");
    if(!card) return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });

  $("brandImabProductsGrid")?.addEventListener("click",e=>{
    const card=e.target.closest(".brand-product-card");
    if(!card) return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandImabProductsGrid")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ") return;
    const card=e.target.closest(".brand-product-card");
    if(!card) return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });

  $("brand3fProductsGrid")?.addEventListener("click",e=>{
    const card=e.target.closest(".brand-product-card");
    if(!card) return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brand3fProductsGrid")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ") return;
    const card=e.target.closest(".brand-product-card");
    if(!card) return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });

  function renderCategoryFilter(){
    const select=$("categoryFilter"); if(!select)return; const current=select.value;
    const cats=[["digital","Fechadura Digital"],["mechanical","Fechaduras Mecânicas"],["hinges","Dobradiças"],["handles","Puxadores"],["accessories","Acessórios"],["auxiliaries","Auxiliares"]];
    select.innerHTML='<option value="">Todas as categorias</option>'+cats.map(([v,l])=>`<option value="${v}">${escapeHtml(l)}</option>`).join(""); select.value=cats.some(([v])=>v===current)?current:"";
  }
  function renderColors(){
    const select=$("colorFilter"); if(!select)return;
    const current=select.value;
    select.innerHTML='<option value="">Todas as cores</option>'+COLOR_FILTERS.map(c=>`<option value="${escapeHtml(c.key)}">${escapeHtml(c.label)}</option>`).join("");
    select.value=COLOR_FILTERS.some(c=>c.key===current)?current:"";
    const valueEl=$("colorFilterValue");
    if(valueEl) valueEl.textContent=select.value || "Todas as cores";
    const options=$("colorOptions");
    if(options){
      options.innerHTML='';
      COLOR_FILTERS.forEach(c=>{
        const count=PRODUCTS.filter(p=>canonicalColorKeys(p).includes(c.key)).length;
        const btn=document.createElement("button");
        btn.type="button"; btn.className="color-option"; btn.dataset.color=c.key;
        btn.setAttribute("role","option"); btn.setAttribute("aria-label",`Cores: ${c.label}`);
        btn.setAttribute("title",`Cores: ${c.label}`);
        btn.setAttribute("aria-selected",String(c.key===select.value));
        btn.innerHTML=`<span class="color-option-dot" style="--swatch:${c.hex}"></span><span class="color-option-name">${escapeHtml(c.label)}</span><span class="color-option-count">${count}</span>`;
        if(c.key===select.value) btn.classList.add("is-selected");
        btn.onclick=()=>{
          select.value=c.key;
          select.dispatchEvent(new Event("change",{bubbles:true}));
          closeColorPopover();
        };
        options.appendChild(btn);
      });
    }
  }
  function renderBrands(){
    const select=$("brandFilter"), current=select.value;
    const brands=[...new Set([...STATIC_BRANDS,...PRODUCTS.map(p=>p.brand).filter(Boolean)])].sort((a,b)=>normalize(a).localeCompare(normalize(b)));
    select.innerHTML=`<option value="">${escapeHtml(t("catalog.allBrands"))}</option>`;
    brands.forEach(b=>{const o=document.createElement("option");o.value=b;o.textContent=b;select.appendChild(o)});
    select.value=brands.includes(current)?current:"";
  }
  function renderSubcategories(){
    const select=$("subcategoryFilter"), current=select.value;
    const source=state.activeCategory ? PRODUCTS.filter(p=>p.category===state.activeCategory) : PRODUCTS;
    const values=[...new Set(source.map(p=>p.subcategory).filter(Boolean))].sort();
    const mechanicalChoices=["Portas de Abrir","Portas de Correr","Portas de Vidro","Portas Pivotantes","Portas de Alumínio"];
    const digitalChoices=["Digital|Embutir|Portas de Abrir","Digital|Embutir|Portas de Correr","Digital|Embutir|Portas de Vidro","Digital|Sobrepor|Portas de Abrir","Digital|Sobrepor|Portas de Correr","Digital|Sobrepor|Portas de Vidro","Digital|Móveis"];
    const extraMechanical = state.activeCategory==="mechanical" ? mechanicalChoices.filter(v=>!values.includes(v)) : [];
    const extraDigital = state.activeCategory==="digital" ? digitalChoices.filter(v=>!values.includes(v)) : [];
    const accessoryChoices=["Amortecedores","Porta de Correr","Cadeados","Fechos","Ferrolho/Trinco","Guia","Molas","Olho Mágico","Pivôs","Prendedores","Vedação"];
    const extraAccessories = state.activeCategory==="accessories" ? accessoryChoices.filter(v=>!values.includes(v)) : [];
    const hingeChoices=["Hamburguesa","Vai & Vem","Sobrepor","Dobradiça de Inox","Dobradiça de Aço Carbono"];
    const extraHinges = state.activeCategory==="hinges" ? hingeChoices.filter(v=>!values.includes(v)) : [];
    const handleChoices = state.activeCategory==="handles" ? ["Handles|Concha","Handles|Tipo H|30 × 10","Handles|Tipo H|40 × 10","Handles|Tipo U|20 × 10","Handles|Tipo U|30 × 15","Handles|Tipo U|40 × 20","Handles|Tipo U|50 × 20"] : [];
    const allValues=[...values,...extraMechanical,...extraDigital,...extraAccessories,...extraHinges,...handleChoices];
    select.innerHTML=`<option value="">${escapeHtml(t("catalog.allSubcategories"))}</option>`;
    allValues.forEach(v=>{const o=document.createElement("option");o.value=v;
      if(v.startsWith("Digital|")){
        const [,install,door]=v.split("|");
        if(install==="Móveis") {
          o.textContent=state.lang==="en" ? "Furniture Locks" : "Fechadura para Móveis";
        } else {
          o.textContent=state.lang==="en" ? `${install==="Sobrepor"?"Surface Mounted":"Mortise"} — ${door==="Portas de Abrir"?"Swing Doors":"Sliding Doors"}` : `${install} — ${door}`;
        }
      } else if(v.startsWith("Handles|")){ const [,type,size]=v.split("|"); o.textContent=size ? `${type} — ${size}` : type; } else o.textContent=v;
      select.appendChild(o);
    });
    select.value=allValues.includes(current)?current:"";
  }
  function renderMaterials(){
    const select=$("materialFilter"), current=select.value;
    const values=[...new Set(PRODUCTS.flatMap(productMaterials).filter(Boolean))].sort((a,b)=>normalize(a).localeCompare(normalize(b)));
    select.innerHTML=`<option value="">${escapeHtml(t("catalog.allMaterials"))}</option>`;
    values.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;select.appendChild(o)});
    select.value=values.includes(current)?current:"";
  }
  function renderChips(){
    // Os filtros rápidos de tecnologia (Senha, RFID, Sobrepor,
    // Biometria, Aplicativo, Bluetooth, Chave mecânica, Embutir,
    // Wi‑Fi, Reconhecimento facial e Móveis) foram removidos do catálogo.
    const chips=$("chips");
    if(chips) chips.replaceChildren();
  }
  function isHingeProduct(p){
    const cat=normalize(p.category||"");
    return cat==="hinges" || cat==="dobradicas" || cat==="dobradiças";
  }
  function isHingeSurfaceMount(p){
    // Sobrepor é uma classificação explícita: nunca inferir pelo texto/nome.
    return isHingeProduct(p) && normalize(p.hingeType||"")===normalize("Sobrepor");
  }
  function isHingeMaterial(p,materialKey){
    if(!isHingeProduct(p)) return false;
    const material=normalize(p.material||"");
    if(materialKey==="Aço Inox") return material.includes("inox");
    if(materialKey==="Aço Carbono") return material.includes("aço carbono") || material.includes("aco carbono");
    return false;
  }
  // REGRA DEFINITIVA DE MATERIAL:
  // Aço Carbono e Aço Inox são materiais mutuamente exclusivos.
  // Nenhum produto de um material pode aparecer na subcategoria do outro.
  function hingeMaterialInvariant(p){
    if(!isHingeProduct(p)) return true;
    const material=normalize(p.material||"");
    const name=normalize(p.name||"");
    const sub=normalize(p.subcategory||"");
    const carbon=material.includes("aço carbono") || material.includes("aco carbono");
    const inox=material.includes("aço inox") || material.includes("aco inox") || material==="inox";
    if(carbon && inox) return false;
    if(carbon && (sub.includes("inox") || name.includes("aço inox") || name.includes("aco inox"))) return false;
    if(inox && (sub.includes("carbono") || name.includes("aço carbono") || name.includes("aco carbono"))) return false;
    return true;
  }

  // REGRA DEFINITIVA DE LOCALIZAÇÃO: quando um produto possui placementPath,
  // esse caminho é soberano. Nenhum filtro derivado de texto pode realocá-lo.
  function placementMatches(p, selectedCategory=state.activeCategory){
    const path=Array.isArray(p.placementPath)?p.placementPath:[];
    if(!path.length) return !selectedCategory || p.category===selectedCategory;
    return !selectedCategory || path[0]===selectedCategory;
  }

  // REGRA DEFINITIVA DE CLASSIFICAÇÃO POR NOME:
  // qualquer produto cujo nome contenha "cadeado" pertence exclusivamente a
  // Acessórios -> Cadeados. Ele só pode aparecer fora desse caminho na visão
  // global "Ver todos os produtos".
  function isPadlockNamedProduct(p){
    return normalize(String(p?.name||"")).includes("cadeado");
  }
  // REGRA DEFINITIVA DE LOCALIZAÇÃO DO AMORTECEDOR: qualquer produto cujo
  // nome contenha "amortecedor" pertence exclusivamente a Acessórios -> Amortecedores,
  // além da visão global "Ver todos os produtos". Nunca deve aparecer em outra subcategoria.
  function isDoorStopperNamedProduct(p){
    return normalize(String(p?.name||"")).includes("amortecedor");
  }
  function isDoorStopperPlacementAllowed(p){
    const isStopper=isDoorStopperNamedProduct(p);
    const isStopperTab=normalize(p.subcategory||"")===normalize("Amortecedores")
      || (Array.isArray(p.placementPath) && normalize(p.placementPath[1]||"")===normalize("Amortecedores"));
    if(isStopper){
      if(state.showAllCategory) return true;
      if(state.activeCategory!=="accessories") return false;
      const selected=normalize($("subcategoryFilter")?.value||"");
      const accessorySub=normalize(state.accessorySubcategory||"");
      const amortecedoresSelected=selected===normalize("Accessory|Amortecedores") || accessorySub===normalize("Amortecedores") || selected===normalize("Amortecedores");
      return amortecedoresSelected;
    }
    if(state.activeCategory==="accessories"){
      const selected=normalize($("subcategoryFilter")?.value||"");
      const accessorySub=normalize(state.accessorySubcategory||"");
      const amortecedoresSelected=selected===normalize("Accessory|Amortecedores") || accessorySub===normalize("Amortecedores") || selected===normalize("Amortecedores");
      if(amortecedoresSelected && !isStopperTab) return false;
    }
    if(isStopperTab) return state.showAllCategory;
    return true;
  }

  function isPadlockPlacementAllowed(p){
    const isPadlock=isPadlockNamedProduct(p);
    const isPadlockTab=normalize(p.subcategory||"")===normalize("Cadeados")
      || (Array.isArray(p.placementPath) && normalize(p.placementPath[1]||"")===normalize("Cadeados"));
    // Cadeados têm dois únicos locais válidos de exibição:
    // 1) Acessórios -> Cadeados
    // 2) visão global "Ver todos os produtos"
    // O nome é a fonte de verdade para identificar um cadeado.
    if(isPadlock){
      if(state.showAllCategory) return true;
      if(state.activeCategory!=="accessories") return false;
      const selected=normalize($("subcategoryFilter")?.value||"");
      const accessorySub=normalize(state.accessorySubcategory||"");
      const cadeadosSelected=selected===normalize("Accessory|Cadeados") || accessorySub===normalize("Cadeados") || selected===normalize("Cadeados");
      return cadeadosSelected;
    }
    // Nenhum produto que não tenha "Cadeado" no nome pode aparecer em Cadeados.
    if(state.activeCategory==="accessories"){
      const selected=normalize($("subcategoryFilter")?.value||"");
      const accessorySub=normalize(state.accessorySubcategory||"");
      const cadeadosSelected=selected===normalize("Accessory|Cadeados") || accessorySub===normalize("Cadeados") || selected===normalize("Cadeados");
      if(cadeadosSelected) return false;
    }
    if(isPadlockTab) return state.showAllCategory;
    return true;
  }

  // Localização estrita para produtos que a usuária determinou em uma única subcategoria.
  // Eles aparecem apenas na subcategoria exata; a visão global também pode
  // ocultar explicitamente produtos com regra de localização exclusiva.
  // Produto de vedação com localização soberana: somente Acessórios -> Vedação,
  // exceto na visão global acionada por “Ver todos os produtos” ou “Produtos”.
  function isBatenteSealingProduct(p){
    return p?.id === "borracha-batente-portas-madeira";
  }

  // REGRA EXCLUSIVA DE PORTA DE CORRER: roldanas e trilhos/canaletas incluídos aqui
  // Acessórios -> Porta de Correr. Eles não aparecem na visão global
  // "Ver todos os produtos" / categoria "Produtos".
  function isSlidingRollerProduct(p){
    return p?.id === "par-roldanas-concavas-rolamento-blindado" ||
      p?.id === "par-roldanas-concavas-rolamento-blindado-4-rodas" ||
      p?.id === "par-roldanas-concavas-rolamento-blindado-duas-rodas-2" ||
      p?.id === "trilho-2mt-aluminio-reto-porta-de-correr" ||
      p?.id === "canaleta-1mt-aluminio-u-porta-de-correr";
  }

  function isSlidingRollerPlacementAllowed(p){
    if(!isSlidingRollerProduct(p)) return true;
    if(state.showAllCategory) return true;
    // REGRA ABSOLUTA: este produto só pode ser exibido em
    // Acessórios -> Porta de Correr. Não aparece em nenhuma outra
    // categoria, subcategoria, busca ou na visão global de Produtos.
    if(state.activeCategory !== "accessories") return false;
    const selected=String($('subcategoryFilter')?.value||'');
    const accessorySub=normalize(state.accessorySubcategory||'');
    return selected === "Accessory|Porta de Correr" || accessorySub === normalize("Porta de Correr");
  }

  // REGRA EXCLUSIVA: Fechadura Retrô Blim-Blim EXTERNA pertence somente
  // a Fechaduras Mecânicas -> Fechaduras Externas. A visão global continua
  // liberada quando o usuário escolhe “Ver todos os produtos”/“Produtos”.
  function isBlimBlimExterna(p){
    return p?.id === "fechadura-retro-blim-blim-externa";
  }

  // REGRA EXCLUSIVA: HATO 2 EXTERNA pertence somente a Fechaduras Mecânicas -> Externa.
  // A visão global “Ver todos os produtos”/“Produtos” continua liberada.
  function isHato2Externa(p){
    return p?.id === "fechadura-hato-2-externa-inox-55mm-imab";
  }

  // REGRA EXCLUSIVA: Florença Interna pertence somente a Fechaduras Mecânicas -> Interna.
  // Fica disponível também na visão global "Ver todos os produtos".
  function isFlorencaInterna(p){
    return p?.id === "fechadura-florenca-interna-55mm-silvana";
  }

  function strictPlacementAllowed(p){
    if(!p) return false;
    if(state.menuProductFilter==="handles-all" && state.activeCategory==="handles") return p.category==="handles";
    if(state.showAllCategory) return true;
    if(isHato2Externa(p)){
      if(state.showAllCategory) return true;
      if(state.activeCategory !== "mechanical") return false;
      if(state.mechanicalLockType !== "externa") return false;
      if(state.mechanicalDoor && state.mechanicalDoor !== "Portas de Abrir") return false;
      return true;
    }
    if(isBlimBlimExterna(p)){
      if(state.showAllCategory) return true;
      if(state.activeCategory!=="mechanical") return false;
      if(state.mechanicalLockType!=="externa") return false;
      if(state.mechanicalDoor && state.mechanicalDoor!=="Portas de Abrir") return false;
      return true;
    }
    if(isFlorencaInterna(p)){
      if(state.showAllCategory) return true;
      if(state.activeCategory!=="mechanical") return false;
      if(state.mechanicalLockType!=="interna") return false;
      if(state.mechanicalDoor && state.mechanicalDoor!=="Portas de Abrir") return false;
      return true;
    }
    if(p.neverShowGlobal && state.showAllCategory) return false;
    if(isBatenteSealingProduct(p)){
      if(state.showAllCategory) return true;
      if(state.activeCategory !== "accessories") return false;
      const selected=String($('subcategoryFilter')?.value||'');
      const accessorySub=normalize(state.accessorySubcategory||'');
      return selected === "Accessory|Vedação" || accessorySub === normalize("Vedação");
    }
    if(!p.strictPlacementOnly) return true;
    if(state.showAllCategory) return true;
    const path=Array.isArray(p.placementPath)?p.placementPath:[];
    if(path.length<2) return false;
    if(state.activeCategory!==path[0]) return false;
    const selected=String($('subcategoryFilter')?.value||'');
    const category=String(path[0]||'');
    const sub=String(path[1]||'');
    // O caminho explícito deve usar o namespace da própria categoria.
    // Ex.: Handles|Concha para Puxadores -> Concha.
    const wanted=category==='accessories' ? `Accessory|${sub}`
      : category==='handles' ? `Handles|${sub}`
      : category==='hinges' ? `Hinge|${sub}`
      : `${category}|${sub}`;

    // Fechaduras mecânicas usam uma navegação em dois níveis controlada por
    // state.mechanicalLockType/state.mechanicalDoor. O filtro visual
    // subcategoryFilter fica vazio nessa tela, então não podemos exigir
    // selected === "mechanical|externa"; devemos validar o estado atual.
    if(category==='mechanical') {
      // Fechaduras mecânicas possuem dois níveis de navegação:
      // ambiente (externa/interna/banheiro) + tipo de porta.
      // placementPath[1] é o tipo de porta, não o ambiente.
      // Portanto, valide cada nível contra seus campos próprios.
      if(state.mechanicalLockType && normalize(p.mechanicalType||'') !== normalize(state.mechanicalLockType)) return false;
      if(state.mechanicalDoor) {
        const doors=Array.isArray(p.mechanicalDoors) ? p.mechanicalDoors : [p.subcategory||""];
        if(!doors.some(d=>normalize(d)===normalize(state.mechanicalDoor))) return false;
      }
      return true;
    }

    // Puxadores Tipo U possuem uma hierarquia adicional:
    // Puxadores -> Tipo U -> tamanho. Nesse caso, o filtro ativo inclui o
    // tipo e o tamanho (ex.: Handles|Tipo U|50 × 20).
    if(category==='handles' && normalize(p.handleType||'')===normalize("Tipo U")){
      const expected=`Handles|${p.handleType}|${p.handleSize||sub}`;
      return selected===expected
        || (normalize(selected)===normalize(`Handles|${p.handleType}|${sub}`));
    }
    return selected===wanted
      || (category==='accessories' && normalize(state.accessorySubcategory||'')===normalize(sub));
  }

  function productMatches(p){
    if(!strictPlacementAllowed(p)) return false;
    if(!placementMatches(p)) return false;
    if(!hingeMaterialInvariant(p)) return false;
    const q=normalize($("searchInput").value);
    const searchBlock=classifySearchBlock(q);
    if(q && searchBlock && !searchBlockMatchesProduct(p,searchBlock)) return false;
    const categoryValue=$("categoryFilter")?.value||"";
    const categoryOk=!categoryValue || p.category===categoryValue;
    const brandOk=!$("brandFilter").value || normalize(p.brand)===normalize($("brandFilter").value);
    const selectedSubcategory=$("subcategoryFilter").value;
    let subcategoryOk=!selectedSubcategory || p.subcategory===selectedSubcategory;
    if(state.activeCategory==="digital" && state.digitalInstall && !selectedSubcategory){
      subcategoryOk = p.digitalInstall ? normalize(p.digitalInstall)===normalize(state.digitalInstall) : false;
    }
    if(state.activeCategory==="digital" && selectedSubcategory.startsWith("Digital|")){
      const [,install,door]=selectedSubcategory.split("|");
      const text=normalize(JSON.stringify(p.basic)+" "+JSON.stringify(p.technical)+" "+JSON.stringify(p));
      const explicitInstall=p.digitalInstall ? normalize(p.digitalInstall)===normalize(install) : null;
      const installOk=explicitInstall!==null ? explicitInstall : text.includes(normalize(install));
      if(!door) {
        subcategoryOk=installOk;
      } else {
        const explicitDoor=p.digitalDoor ? normalize(p.digitalDoor)===normalize(door) : null;
        const doorOk=explicitDoor!==null ? explicitDoor : (door==="Portas de Correr" ? text.includes("correr") : (text.includes("giro") || text.includes("pivotante") || text.includes("abrir")));
        subcategoryOk=installOk && doorOk;
      }
    }
    if(state.activeCategory==="accessories" && selectedSubcategory.startsWith("Accessory|")){
      const [,sub]=selectedSubcategory.split("|");
      subcategoryOk=normalize(p.subcategory||"")===normalize(sub);
    }
    // Filtro de canto: quando o usuário escolhe Canto Reto/Redondo, a seleção
    // é soberana e nunca deve cair de volta para "Dobradiça de Inox".
    if(state.activeCategory==="hinges" && state.hingeCornerSubcategory){
      const wantedCorner=normalize(state.hingeCornerSubcategory);
      const productCorner=normalize(p.hingeCorner||"");
      if(state.hingeSubcategory==="Dobradiça de Aço Carbono"){
        subcategoryOk = isHingeMaterial(p,"Aço Carbono") && productCorner === wantedCorner;
      } else if(state.hingeSubcategory==="Dobradiça de Inox"){
        subcategoryOk = isHingeMaterial(p,"Aço Inox") && productCorner === wantedCorner;
      } else {
        subcategoryOk = productCorner === wantedCorner;
      }
    }
    if(state.activeCategory==="hinges" && selectedSubcategory.startsWith("Hinge|")){
      const hingeParts=selectedSubcategory.split("|");
      if(hingeParts.length===3 && (hingeParts[1]==="Dobradiça de Inox" || hingeParts[1]==="Dobradiça de Aço Carbono")){
        const cornerSub=hingeParts[2];
        if(p.category!=="hinges" && p.category!=="dobradicas" && p.category!=="dobradiças") subcategoryOk=false;
        else {
          const explicitCorner=normalize(p.hingeCorner||"");
          const cornerOk=explicitCorner===normalize(cornerSub);
          const wantedMaterial=hingeParts[1]==="Dobradiça de Aço Carbono" ? "Aço Carbono" : "Aço Inox";
          subcategoryOk=isHingeMaterial(p,wantedMaterial) && cornerOk;
        }
      } else if(hingeParts.length===3 && hingeParts[1]==="Sobrepor"){
        const materialSub=hingeParts[2];
        const text=normalize(JSON.stringify(p.basic)+" "+JSON.stringify(p.technical)+" "+JSON.stringify(p.name)+" "+JSON.stringify(p.description)+" "+JSON.stringify(p.material)+" "+JSON.stringify(p.subcategory));
        if(p.category!=="hinges" && p.category!=="dobradicas" && p.category!=="dobradiças") subcategoryOk=false;
        else {
          const material=normalize(p.material||"");
          const materialOk=materialSub==="Aço Inox" ? (material.includes("inox") || text.includes("inox")) : (material.includes("aço carbono") || material.includes("aco carbono") || text.includes("aço carbono") || text.includes("aco carbono"));
          subcategoryOk=isHingeSurfaceMount(p) && materialOk;
        }
      } else {
      const [,sub]=selectedSubcategory.split("|");
      const text=normalize(JSON.stringify(p.basic)+" "+JSON.stringify(p.technical)+" "+JSON.stringify(p.name)+" "+JSON.stringify(p.description)+" "+JSON.stringify(p.material));
      if(p.category!=="hinges" && p.category!=="dobradicas" && p.category!=="dobradiças") subcategoryOk=false;
      else if(sub==="Dobradiça de Inox") subcategoryOk=!isHingeSurfaceMount(p) && isHingeMaterial(p,"Aço Inox");
      else if(sub==="Dobradiça de Aço Carbono") subcategoryOk=!isHingeSurfaceMount(p) && isHingeMaterial(p,"Aço Carbono");
      else subcategoryOk=normalize(p.subcategory||"")===normalize(sub);
      }
    }
    // Regra soberana de Sobrepor: só entra quem possui hingeType="Sobrepor" explicitamente.
    if(state.activeCategory==="handles" && selectedSubcategory.startsWith("Handles|")) {
      const parts=selectedSubcategory.split("|");
      if(parts.length===2 && parts[1]==="Concha") {
        subcategoryOk = p.category==="handles" && (normalize(p.handleType||"")===normalize("Concha") || normalize(p.subcategory||"")===normalize("Concha"));
      }
    }
    if(state.activeCategory==="hinges" && state.hingeSubcategory==="Sobrepor"){
      subcategoryOk=isHingeSurfaceMount(p);
      if(state.hingeMaterialSubcategory){
        subcategoryOk=subcategoryOk && isHingeMaterial(p,state.hingeMaterialSubcategory);
      }
    }
    if(state.activeCategory==="hinges" && selectedSubcategory==="Hinge|Sobrepor"){
      subcategoryOk=isHingeSurfaceMount(p);
    }
    if(state.activeCategory==="hinges" && selectedSubcategory.startsWith("Hinge|Sobrepor|")){
      const materialSub=selectedSubcategory.split("|")[2];
      subcategoryOk=isHingeSurfaceMount(p) && isHingeMaterial(p,materialSub);
    }
    if(state.activeCategory==="handles" && (state.showAllCategory || state.menuProductFilter==="handles-all")){
      subcategoryOk = p.category==="handles";
    } else if(state.activeCategory==="handles"){
      if(state.handlesSize){
        subcategoryOk = p.category==="handles" && normalize(p.handleType||"")===normalize(state.handlesType) && normalize(p.handleSize||"")===normalize(state.handlesSize);
      } else if(state.handlesType){
        subcategoryOk = p.category==="handles" && normalize(p.handleType||"")===normalize(state.handlesType);
      } else {
        subcategoryOk=false;
      }
    }
    if(state.activeCategory==="mechanical"){
      const text=normalize(JSON.stringify(p.basic)+" "+JSON.stringify(p.technical)+" "+JSON.stringify(p.name)+" "+JSON.stringify(p.description));
      const mechanicalType=p.mechanicalType || (
        text.includes("banheiro") || text.includes("wc") ? "banheiro" :
        text.includes("externa") || text.includes("externas") ? "externa" :
        text.includes("interna") || text.includes("internas") || text.includes("interno") ? "interna" : ""
      );
      const typeOk=(state.menuProductFilter==="mechanical" || state.showAllCategory) ? true : (state.mechanicalLockType ? mechanicalType===state.mechanicalLockType : false);
      const doorOk=!state.mechanicalDoor || (Array.isArray(p.mechanicalDoors) ? p.mechanicalDoors.some(d=>normalize(d)===normalize(state.mechanicalDoor)) : normalize(p.subcategory||"")===normalize(state.mechanicalDoor));
      subcategoryOk=typeOk && doorOk;
    }
    // Se houver um caminho explícito de localização, a seleção de subcategoria
    // nunca pode fazer o produto aparecer em outro local.
    if(selectedSubcategory && Array.isArray(p.placementPath) && p.placementPath.length>1){
      if(selectedSubcategory.startsWith("Accessory|")){
        const wanted=selectedSubcategory.split("|")[1]||"";
        subcategoryOk=subcategoryOk && normalize(p.placementPath[1]||"")===normalize(wanted);
      } else if(selectedSubcategory.startsWith("Hinge|")){
        const parts=selectedSubcategory.split("|");
        if(parts.length===2 && parts[1]!=="Sobrepor"){
          subcategoryOk=subcategoryOk && normalize(p.placementPath[1]||"")===normalize(parts[1]);
        } else if(parts.length===3 && parts[1]!=="Sobrepor"){
          subcategoryOk=subcategoryOk && normalize(p.placementPath[1]||"")===normalize(parts[1]) && normalize(p.placementPath[2]||"")===normalize(parts[2]);
        }
      } else if(!selectedSubcategory.startsWith("Digital|") && !selectedSubcategory.startsWith("Handles|")){
        subcategoryOk=subcategoryOk && normalize(p.placementPath[1]||"")===normalize(selectedSubcategory);
      }
    }
    const selectedMaterial=$("materialFilter")?.value||"";
    const materialOk=!selectedMaterial || productMaterials(p).some(m=>normalize(m)===normalize(selectedMaterial));
    const selectedColor=$("colorFilter")?.value||"";
    const colorOk=!selectedColor || canonicalColorKeys(p).includes(selectedColor);
    const text=PRODUCT_SEARCH_TEXT.get(p.id)||"";
    const aliasGroup=SEARCH_ALIASES.find(group=>group.some(alias=>q.includes(normalize(alias))));
    const matchedAlias=aliasGroup?.find(alias=>q.includes(normalize(alias)));
    const residualQuery=matchedAlias ? q.replace(normalize(matchedAlias)," ").replace(/\s+/g," ").trim() : q;
    const qWords=residualQuery.split(/\s+/).filter(Boolean);
    const aliasOk=!aliasGroup || aliasGroup.some(alias=>text.includes(normalize(alias)));
    // A busca não depende mais de igualdade literal: primeiro tenta a
    // correspondência exata e, quando ela não existe, usa relevância por
    // nome, descrição, dados técnicos, sinônimos e pequenos erros de digitação.
    const qOk=!q || intelligentSearchMatch(p,q) || (aliasGroup && aliasOk && qWords.every(w=>text.includes(w)));
    const tagOk=!state.activeTag || text.includes(normalize(state.activeTag));
    const padlockPlacementOk=isPadlockPlacementAllowed(p);
    const doorStopperPlacementOk=isDoorStopperPlacementAllowed(p);
    const slidingRollerPlacementOk=isSlidingRollerPlacementAllowed(p);
    // Regra definitiva: quando a usuária definiu um placementPath completo,
    // a categoria/subcategoria só pode corresponder exatamente a esse caminho.
    // A única visão que ignora a categoria é o catálogo global (Ver todos).
    const exactPlacementOk = state.showAllCategory || !state.activeCategory || !Array.isArray(p.placementPath) || p.placementPath.length < 2
      ? true
      : (p.category === "mechanical" && p.placementPath[0] === "mechanical")
        ? true
        : (p.category === "handles" && p.placementPath[0] === "handles")
          ? (normalize(p.placementPath[1]||'')===normalize(p.handleType||'')
             && (!p.placementPath[2] || normalize(p.placementPath[2]||'')===normalize(p.handleSize||'')))
          : p.placementPath[0]===state.activeCategory && normalize(p.placementPath[1]||'')===normalize(p.subcategory||'');
    return brandOk && subcategoryOk && materialOk && colorOk && qOk && tagOk && categoryOk && exactPlacementOk && padlockPlacementOk && doorStopperPlacementOk && slidingRollerPlacementOk;
  }
  function stopProductCardCarousels(){
    (state.productCardCarouselTimers||[]).forEach(clearInterval);
    state.productCardCarouselTimers=[];
  }
  function getColorCover(color){
    if(!color) return "";
    const imgs=color.images;
    if(imgs && typeof imgs==="object" && !Array.isArray(imgs)){
      return String(imgs.principal||imgs.cover||imgs.capa||color.cover||color.image||Object.values(imgs).find(v=>typeof v==="string")||"");
    }
    if(Array.isArray(imgs) && imgs.length) return String(imgs[0]||"");
    return String(color.cover||color.image||"");
  }
  function findColorVariant(p,selectedColor){
    if(!p || !selectedColor) return null;
    const wanted=normalize(selectedColor);
    return (Array.isArray(p.colors)?p.colors:[]).find(c=>normalize(c?.name||"")===wanted || normalize(c?.name||"").includes(wanted) || wanted.includes(normalize(c?.name||""))) || null;
  }
  function getCardImageForColor(p,selectedColor=""){
    const variant=findColorVariant(p,selectedColor);
    return getColorCover(variant) || (p?.id === "fechadura-hato-2-externa-inox-55mm-imab" ? "Todas as Imagens/Produtos/mechanical/hato-2-externa/polido-capa.webp" : (p?.id === "d220-imab" ? "Todas as Imagens/Produtos/d220-primeira-imagem.webp" : p?.cover || (Array.isArray(p?.images)?p.images[0]:"")));
  }
  function getCardCarouselImages(p,selectedColor=""){
    const out=[];
    const add=v=>{ if(typeof v==="string" && v && !out.includes(v)) out.push(v); };
    const variant=findColorVariant(p,selectedColor);
    if(variant){
      add(getColorCover(variant));
      const imgs=variant.images;
      if(Array.isArray(imgs)) imgs.forEach(add);
      else if(imgs && typeof imgs==="object") Object.values(imgs).forEach(add);
      return [...new Set(out)].slice(0,8);
    }
    (p.colors||[]).forEach(c=>{
      add(getColorCover(c));
      const imgs=c?.images;
      if(Array.isArray(imgs)) imgs.forEach(add);
      else if(imgs && typeof imgs==="object") Object.values(imgs).forEach(add);
    });
    if(!out.length){
      const imgs=p?.images;
      if(Array.isArray(imgs)) imgs.forEach(add);
      else if(imgs && typeof imgs==="object") Object.values(imgs).forEach(add);
    }
    if(p?.cover) out.unshift(p.cover);
    return [...new Set(out)].slice(0,8);
  }
  function startProductCardCarousels(){
    stopProductCardCarousels();
    document.querySelectorAll(".product-card[data-carousel-images]").forEach(card=>{
      let images=[];
      try{ images=JSON.parse(card.dataset.carouselImages||"[]"); }catch(_){ images=[]; }
      const img=card.querySelector(".card-media img");
      if(!img || images.length<2) return;
      let index=0;
      const timer=setInterval(()=>{
        index=(index+1)%images.length;
        img.classList.add("is-carousel-fading");
        window.setTimeout(()=>{ img.src=images[index]; img.classList.remove("is-carousel-fading"); },180);
      },3600);
      state.productCardCarouselTimers.push(timer);
    });
  }

  function render(){
    const selectedSubcategory=$("subcategoryFilter").value;
    const hasSearchQuery=Boolean(normalize($("searchInput")?.value||""));
    const mechanicalWaiting = !hasSearchQuery && state.activeCategory==="mechanical" && !state.mechanicalLockType && !state.mechanicalDoor && state.menuProductFilter !== "mechanical" && !state.showAllCategory;
    const digitalEmptyChoice = !hasSearchQuery && state.activeCategory==="digital" && selectedSubcategory.startsWith("Digital|") && !PRODUCTS.some(p=>p.category==="digital" && productMatches(p));
    const accessoryWaiting = !hasSearchQuery && state.activeCategory==="accessories" && !selectedSubcategory.startsWith("Accessory|") && !state.accessorySubcategory && !state.showAllCategory;
    const handlesWaiting = !hasSearchQuery && state.activeCategory==="handles" && !state.handlesType && state.menuProductFilter!=="handles-all" && !state.showAllCategory;
    // VISÃO GLOBAL: quando o usuário está em “Produtos > Ver todos”,
    // não aplicar NENHUM filtro de categoria/subcategoria/placement.
    // A lista global é literalmente todo o catálogo carregado em PRODUCTS.
    let list;
    if(state.menuProductFilter==="handles-all" && state.activeCategory==="handles"){
      list=PRODUCTS.filter(p=>p.category==="handles");
    } else if(state.menuProductFilter==="digital-all" && state.activeCategory==="digital"){
      // “Ver todos os produtos” dentro de Fechaduras Digitais = somente
      // todos os produtos digitais cadastrados, independentemente de instalação.
      list=PRODUCTS.filter(p=>p.category==="digital");
    } else {
      list = state.showAllCategory
        ? PRODUCTS
        : ((mechanicalWaiting || digitalEmptyChoice || accessoryWaiting || handlesWaiting) ? [] : PRODUCTS.filter(productMatches));
    }

    // CATÁLOGO GLOBAL — ordem fixa de apresentação.
    // A visão “Produtos” deve seguir sempre a sequência das coleções do site:
    // 1) Fechaduras Digitais, 2) Fechaduras Mecânicas, 3) Dobradiças,
    // 4) Puxadores, 5) Acessórios, 6) Auxiliares.
    // “Auxiliares” permanece como posição reservada caso produtos dessa categoria
    // sejam cadastrados futuramente.
    if(state.showAllCategory){
      const categoryOrder={digital:0,mechanical:1,hinges:2,handles:3,accessories:4,auxiliaries:5,auxiliary:5};
      const seenNames=new Set();
      list=[...PRODUCTS]
        .filter(p=>{
          const key=normalize(String(p?.name||"")) + "|" + normalize(String(p?.brand||""));
          if(!key || seenNames.has(key)) return false;
          seenNames.add(key);
          return true;
        })
        .sort((a,b)=>{
          const ca=categoryOrder[a?.category] ?? 99;
          const cb=categoryOrder[b?.category] ?? 99;
          if(ca!==cb) return ca-cb;

          // FECHADURAS MECÂNICAS — agrupar modelos da mesma linha.
          // Ex.: Bine Externa → Bine Interna → Bine Banheiro.
          // A ordem entre grupos continua sendo a ordem original do catálogo;
          // apenas os ambientes de um mesmo modelo são reorganizados.
          if(a?.category==='mechanical' && b?.category==='mechanical'){
            // Agrupamento determinístico por família do modelo.
            // A família é identificada pelo nome/modelo comercial, removendo
            // apenas o ambiente (Externa/Interna/Banheiro). Isso também trata
            // modelos cujo campo basic.Model varia entre versões, como HATO 2.
            const mechanicalFamily=(p)=>{
              const raw=normalize(String(p?.name||''));
              const known=[
                ['concept 407','concept 407'],
                ['hato 2','hato 2'],
                ['bine','bine'],
                ['florenca','florenca'],
                ['duna 1','duna 1'],
                ['duna3','duna3']
              ];
              for(const [needle,key] of known){
                if(raw.includes(needle)) return `known:${key}`;
              }
              return `name:${raw
                .replace(/\bporta\s+externa\b/g,'')
                .replace(/\bporta\s+interna\b/g,'')
                .replace(/\bporta\s+banheiro\b/g,'')
                .replace(/\bexterna\b/g,'')
                .replace(/\binterna\b/g,'')
                .replace(/\bbanheiro\b/g,'')
                .replace(/\bwc\b/g,'')
                .replace(/\s+/g,' ')
                .trim()}`;
            };
            const familyA=mechanicalFamily(a);
            const familyB=mechanicalFamily(b);
            if(familyA!==familyB){
              const familyFirstIndex=new Map();
              PRODUCTS.forEach((p,i)=>{
                if(p?.category==='mechanical'){
                  const f=mechanicalFamily(p);
                  if(!familyFirstIndex.has(f)) familyFirstIndex.set(f,i);
                }
              });
              return (familyFirstIndex.get(familyA)??999999) - (familyFirstIndex.get(familyB)??999999);
            }
            const mechanicalType=(p)=>{
              const t=normalize(String(p?.mechanicalType||''));
              const raw=normalize(String(p?.name||''));
              if(t==='externa' || /\bexterna\b/.test(raw)) return 0;
              if(t==='interna' || /\binterna\b/.test(raw)) return 1;
              if(t==='banheiro' || /\bbanheiro\b|\bwc\b/.test(raw)) return 2;
              return 3;
            };
            const typeDiff=mechanicalType(a)-mechanicalType(b);
            if(typeDiff!==0) return typeDiff;
            return PRODUCTS.findIndex(p=>p===a)-PRODUCTS.findIndex(p=>p===b);
          }
          return 0;
        });
    }

    // REGRA SOBERANA DOS PUXADORES — AGRUPAR POR DIMENSÃO E ORDENAR DO MAIOR PARA O MENOR.
    // 1) Puxadores com a mesma dimensão do nome/cadastro (ex.: 30 × 15) ficam sempre juntos.
    // 2) Os grupos de dimensão são ordenados do maior para o menor.
    // 3) Dentro de cada grupo, o comprimento/tamanho do puxador é ordenado do maior para o menor.
    // Ex.: 50 × 20 (2 m, 1,80 m...) > 30 × 15 (40 cm, 30 cm) > 20 × 10 (60 cm, 40 cm, 30 cm).
    if(list.length > 1 && list.some(p => p?.category === "handles")){
      const handleDimension = (p) => {
        const type = normalize(String(p?.handleType || p?.basic?.Formato || ''));
        // No tubular, a dimensão estrutural é o diâmetro (ex.: 32 mm), enquanto 100/80/60/45 cm é o comprimento.
        // Portanto, todos os Tubulares 32 mm permanecem no mesmo grupo.
        if(type.includes('tubular')){
          const tubularText = [p?.name, p?.description, p?.basic?.Formato].map(v => String(v || '')).join(' ');
          const tubularMm = tubularText.match(/(\d+(?:[.,]\d+)?)\s*mm\b/i);
          if(tubularMm){
            return { kind: 'tubular', a: Number(tubularMm[1].replace(',', '.')), b: 0, key: `tubular|${Number(tubularMm[1].replace(',', '.'))}mm` };
          }
        }

        const candidates = [p?.handleSize, p?.subcategory, p?.name, p?.basic?.Formato];
        for(const value of candidates){
          const s = String(value || "");
          const m = s.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
          if(m){
            return { kind: 'rect', a: Number(m[1].replace(',', '.')), b: Number(m[2].replace(',', '.')), key: `${Number(m[1].replace(',', '.'))}x${Number(m[2].replace(',', '.'))}` };
          }
        }
        // Para modelos sem formato AxB, agrupar pela medida estrutural do nome/cadastro.
        const text = candidates.map(v => String(v || '')).join(' ');
        const mm = text.match(/(\d+(?:[.,]\d+)?)\s*mm\b/i);
        if(mm){
          return { kind: type.includes('tubular') ? 'tubular' : 'single', a: Number(mm[1].replace(',', '.')), b: 0, key: `${type}|${Number(mm[1].replace(',', '.'))}mm` };
        }
        const cm = text.match(/(\d+(?:[.,]\d+)?)\s*cm\b/i);
        if(cm){
          return { kind: 'single', a: Number(cm[1].replace(',', '.')), b: 0, key: `${type}|${Number(cm[1].replace(',', '.'))}cm` };
        }
        return { kind: 'unknown', a: -1, b: -1, key: `${type}|unknown` };
      };

      const handleLengthCm = (p) => {
        const candidates = [p?.basic?.Tamanho, p?.name, p?.description];
        for(const value of candidates){
          const s = String(value || "");
          const matches = [...s.matchAll(/(\d+(?:[.,]\d+)?)\s*(metros?|m|cm|mm)\b/gi)];
          if(matches.length){
            // Para nomes com mais de uma medida, usar a maior medida linear encontrada.
            return Math.max(...matches.map(m => {
              const n = Number(String(m[1]).replace(',', '.'));
              const unit = normalize(m[2]);
              if(unit.startsWith('metro') || unit === 'm') return n * 100;
              if(unit === 'mm') return n / 10;
              return n;
            }));
          }
        }
        return -1;
      };

      const handleGroupRank = (p) => {
        const d = handleDimension(p);
        // Dimensões AxB vêm primeiro e são ordenadas numericamente (ex.: 50×20 > 30×15 > 20×10).
        if(d.kind === 'rect') return [0, -d.a, -d.b, d.key];
        // Depois vêm grupos dimensionais sem AxB (ex.: tubular 32 mm), mantendo o agrupamento.
        if(d.kind === 'tubular') return [1, -d.a, 0, d.key];
        if(d.kind === 'single') return [2, -d.a, 0, d.key];
        return [3, 0, 0, d.key];
      };

      list = [...list].sort((a,b) => {
        if(a?.category !== "handles" || b?.category !== "handles") return 0;
        const ga = handleGroupRank(a);
        const gb = handleGroupRank(b);
        for(let i = 0; i < 3; i++){
          if(ga[i] !== gb[i]) return ga[i] < gb[i] ? -1 : 1;
        }
        if(ga[3] !== gb[3]) return ga[3] < gb[3] ? -1 : 1;
        const lengthDiff = handleLengthCm(b) - handleLengthCm(a);
        if(lengthDiff !== 0) return lengthDiff;
        return PRODUCTS.findIndex(p => p === a) - PRODUCTS.findIndex(p => p === b);
      });
    }

    // Dentro de Fechaduras Mecânicas -> Externas, a Blim-Blim Externa deve ser
    // sempre o primeiro produto da lista. Fora dessa subcategoria, mantém-se
    // a ordem original do catálogo.
    if(!state.showAllCategory && state.activeCategory === "mechanical" && state.mechanicalLockType === "externa") {
      list = [...list].sort((a,b) => {
        const aBlim = isBlimBlimExterna(a) ? 0 : 1;
        const bBlim = isBlimBlimExterna(b) ? 0 : 1;
        return aBlim - bBlim;
      });
    }
    const grid=$("productGrid");
    grid.replaceChildren();
    $("emptyState").hidden=list.length!==0;
    const fragment=document.createDocumentFragment();
    const selectedColor=$("colorFilter")?.value||"";
    list.forEach(p=>{
      const card=document.createElement("article");card.className="product-card";card.tabIndex=0;card.dataset.productId=p.id;if(p.id==="puxador-tipo-u-50x20-2m" || p.id==="puxador-tipo-u-50x20-1-8m" || p.id==="puxador-u-50x20-1-5m" || p.id==="puxador-u-50x20-1-2m") card.classList.add("product-card--u50x20");if(p.id==="dobradica-4x3-canto-reto-inox-rolamento-dss") card.classList.add("product-card--dobradica-4x3");if(p.id==="dobradica-3-5x2-5-sobrepor-carbono-dss") card.classList.add("product-card--dobradica-sobrepor-carbono");
      const cardImage = getCardImageForColor(p,selectedColor);
      const carouselImages=getCardCarouselImages(p,selectedColor);
      const carouselAttr=carouselImages.length>1 ? ` data-carousel-images='${escapeHtml(JSON.stringify(carouselImages))}'` : "";
      card.innerHTML=`<div class="card-media" style="--card-photo:url("${escapeHtml(cardImage)}")"${carouselAttr}><img loading="lazy" decoding="async" fetchpriority="low" src="${escapeHtml(cardImage)}" alt="${escapeHtml(p.name)}"></div><div class="card-body"><div class="card-brand">${escapeHtml(p.brand)}</div><h3 class="card-title">${escapeHtml(p.name)}</h3><p class="card-desc">${escapeHtml(p.description)}</p></div>`;
      const cardMedia=card.querySelector(".card-media");
      const cardImg=card.querySelector(".card-media img");
      cardImg?.addEventListener("load",()=>{ if(cardImg.naturalHeight>cardImg.naturalWidth*1.12) cardMedia?.classList.add("card-media--portrait"); },{once:true});
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
    const emptyState=$('emptyState');
    const currentQuery=normalize($("searchInput")?.value||"");
    if(emptyState && list.length===0 && currentQuery && !mechanicalWaiting && !digitalEmptyChoice && !accessoryWaiting && !handlesWaiting){
      emptyState.hidden=false;
      emptyState.classList.remove('empty-state--coming-soon');
      const block=classifySearchBlock(currentQuery);
      const similarPool=PRODUCTS.filter(p=>searchBlock ? searchBlockMatchesProduct(p,block) : true)
        .filter(p=>strictPlacementAllowed(p) && hingeMaterialInvariant(p));
      const similar=[...similarPool]
        .map(p=>({p,score:intelligentSearchScore(p,currentQuery)}))
        .sort((a,b)=>b.score-a.score)
        .slice(0,6)
        .map(x=>x.p);
      emptyState.innerHTML=`<div class="search-no-results"><strong>Produto não encontrado</strong><span>Não encontramos um produto para <b>“${escapeHtml($("searchInput").value||"")}”</b>.</span>${similar.length?`<span class="search-no-results__similar-title">Verifique produtos semelhantes:</span><div class="search-similar-grid">${similar.map(p=>`<button type="button" class="search-similar-card" data-similar-product="${escapeHtml(p.id)}"><span>${escapeHtml(p.brand||"")}</span><strong>${escapeHtml(p.name||"")}</strong></button>`).join("")}</div>`:"<span>Não há produtos semelhantes cadastrados.</span>"}</div>`;
      emptyState.classList.add('empty-state--search');
    }else if(emptyState){
      emptyState.classList.remove('empty-state--coming-soon','empty-state--search');
      emptyState.innerHTML='Produtos serão adicionados em breve';
    }
    decorateEmptyOptionCards();
  }
  $("emptyState")?.addEventListener("click",e=>{
    const card=e.target.closest("[data-similar-product]");
    if(!card) return;
    const product=PRODUCTS_BY_ID.get(card.dataset.similarProduct);
    if(product) navigateToProduct(product);
  });
  $("productGrid").addEventListener("click",e=>{
    const card=e.target.closest(".product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p)}
  });
  $("productGrid").addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ")return;
    const card=e.target.closest(".product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p)}
  });

  function applyGlobalSearchQuery(value){
    const input=String(value||"");
    // Ao pesquisar, a intenção da pesquisa passa a ser o filtro principal.
    // Removemos filtros de navegação anteriores para eles não "esconderem"
    // um produto válido (ex.: estar em Dobradiças e pesquisar "visor").
    state.showAllCategory=false;
    state.activeCategory="";
    state.menuProductFilter="";
    state.activeTag="";
    state.digitalInstall="";
    state.accessorySubcategory="";
    state.hingeSubcategory="";
    state.hingeMaterialSubcategory="";
    state.hingeCornerSubcategory="";
    state.handlesType="";
    state.handlesSize="";
    state.mechanicalLockType="";
    state.mechanicalDoor="";
    const search=$("searchInput");
    if(search && search.value!==input) search.value=input;
    const clearIds=["categoryFilter","brandFilter","subcategoryFilter","materialFilter","colorFilter"];
    clearIds.forEach(id=>{const el=$(id);if(el)el.value="";});
    if(headerSearchInput && headerSearchInput.value!==input) headerSearchInput.value=input;
    renderBrands();
    renderSubcategories();
    renderMaterials();
    renderColors();
    renderChips();
    renderMechanicalSubcategories();
    renderDigitalSubcategories();
    renderAccessorySubcategories();
    renderHingeSubcategories();
    renderHandlesSubcategories();
    renderCategoryShowAll();
    render();
    updateNavigationSnapshot();
  }
  $("searchInput").oninput=()=>applyGlobalSearchQuery($("searchInput").value);
  $("categoryFilter").onchange=()=>{state.showAllCategory=false;state.activeCategory=$("categoryFilter").value||"";state.menuProductFilter="";$("brandFilter").value="";$("subcategoryFilter").value="";renderBrands();renderSubcategories();renderMaterials();renderColors();render();pushNavigationState("#catalogo",{filter:"category"})};
  $("brandFilter").onchange=()=>{state.showAllCategory=false;render();pushNavigationState("#catalogo",{filter:"brand"})};
  bindDssBrandCard();
  bindAssaBrandCard();
  bindDssShowcaseScroll();
  bindVirtusBrandCard();
  bindVirtusShowcaseScroll();
  bindAfonteBrandCard();
  bindGrandcasaBrandCard();
  bindYaleBrandCard();
  bindYaleShowcaseScroll();
  bindPapaizBrandCard();
  bindFermaxBrandCard();
  bindPerfilBrandCard();
  bindPerfilShowcaseScroll();
  bindSilvanaBrandCard();
  bindSilvanaShowcaseScroll();
  bindFermaxShowcaseScroll();
  bindHafeleBrandCard();
  bindHafeleShowcaseScroll();
  bindImabBrandCard();
  bindPadoBrandCard();
  bindImabShowcaseScroll();
  bind3fBrandCard();
  bindHagaBrandCard();
  bindStamBrandCard();
  bindUniaoBrandCard();
  bindZenBrandCard();
  bindZenShowcaseScroll();
  $("brandPerfilProductsGrid")?.addEventListener("click",e=>{
    const card=e.target.closest(".brand-product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandPerfilProductsGrid")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ")return;
    const card=e.target.closest(".brand-product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandHafeleProductsGrid")?.addEventListener("click",e=>{
    const card=e.target.closest(".brand-product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandHafeleProductsGrid")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ")return;
    const card=e.target.closest(".brand-product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandPapaizProductsGrid")?.addEventListener("click",e=>{
    const card=e.target.closest(".brand-product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandPapaizProductsGrid")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ")return;
    const card=e.target.closest(".brand-product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandFermaxProductsGrid")?.addEventListener("click",e=>{
    const card=e.target.closest(".brand-product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandFermaxProductsGrid")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ")return;
    const card=e.target.closest(".brand-product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandAssaProductsGrid")?.addEventListener("click",e=>{
    const card=e.target.closest(".brand-product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandAssaProductsGrid")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ")return;
    const card=e.target.closest(".brand-product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });

  $("brandHagaProductsGrid")?.addEventListener("click",e=>{
    const card=e.target.closest(".brand-product-card");
    if(!card) return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandHagaProductsGrid")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ") return;
    const card=e.target.closest(".brand-product-card");
    if(!card) return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });

  $("brandUniaoProductsGrid")?.addEventListener("click",e=>{const card=e.target.closest(".brand-product-card");if(!card)return;const p=PRODUCTS_BY_ID.get(card.dataset.productId);if(p){e.preventDefault();navigateToProduct(p);}});
  $("brandUniaoProductsGrid")?.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const card=e.target.closest(".brand-product-card");if(!card)return;const p=PRODUCTS_BY_ID.get(card.dataset.productId);if(p){e.preventDefault();navigateToProduct(p);}});

  $("brandStamProductsGrid")?.addEventListener("click",e=>{const card=e.target.closest(".brand-product-card");if(!card)return;const p=PRODUCTS_BY_ID.get(card.dataset.productId);if(p){e.preventDefault();navigateToProduct(p);}});
  $("brandStamProductsGrid")?.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const card=e.target.closest(".brand-product-card");if(!card)return;const p=PRODUCTS_BY_ID.get(card.dataset.productId);if(p){e.preventDefault();navigateToProduct(p);}});

  $("brandPadoProductsGrid")?.addEventListener("click",e=>{const card=e.target.closest(".brand-product-card");if(!card)return;const p=PRODUCTS_BY_ID.get(card.dataset.productId);if(p){e.preventDefault();navigateToProduct(p);}});
  $("brandPadoProductsGrid")?.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const card=e.target.closest(".brand-product-card");if(!card)return;const p=PRODUCTS_BY_ID.get(card.dataset.productId);if(p){e.preventDefault();navigateToProduct(p);}});

  // Vitrines de marcas que podem receber produtos futuramente também usam a mesma navegação do catálogo.
  ["brandAfonteProductsGrid","brandGrandcasaProductsGrid","brandYaleProductsGrid"].forEach(gridId=>{
    const grid=$(gridId); if(!grid)return;
    grid.addEventListener("click",e=>{const card=e.target.closest(".brand-product-card");if(!card)return;const p=PRODUCTS_BY_ID.get(card.dataset.productId);if(p){e.preventDefault();navigateToProduct(p);}});
    grid.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const card=e.target.closest(".brand-product-card");if(!card)return;const p=PRODUCTS_BY_ID.get(card.dataset.productId);if(p){e.preventDefault();navigateToProduct(p);}});
  });

  $("brandZenProductsGrid")?.addEventListener("click",e=>{
    const card=e.target.closest(".brand-product-card");
    if(!card) return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandZenProductsGrid")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ") return;
    const card=e.target.closest(".brand-product-card");
    if(!card) return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandSilvanaProductsGrid")?.addEventListener("click",e=>{
    const card=e.target.closest(".brand-product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });
  $("brandSilvanaProductsGrid")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ")return;
    const card=e.target.closest(".brand-product-card");
    if(!card)return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){e.preventDefault();navigateToProduct(p);}
  });

  $("brandDssProducts")?.addEventListener("click",e=>{
    const card=e.target.closest(".brand-product-card");
    if(!card) return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){ e.preventDefault(); navigateToProduct(p); }
  });
  $("brandDssProducts")?.addEventListener("keydown",e=>{
    if(e.key!=="Enter" && e.key!==" ") return;
    const card=e.target.closest(".brand-product-card");
    if(!card) return;
    const p=PRODUCTS_BY_ID.get(card.dataset.productId);
    if(p){ e.preventDefault(); navigateToProduct(p); }
  });
  function closeColorPopover(){
    const pop=$("colorFilterPopover"), trigger=$("colorFilterTrigger");
    if(pop) pop.hidden=true;
    if(trigger){trigger.setAttribute("aria-expanded","false");}
  }
  function toggleColorPopover(){
    const pop=$("colorFilterPopover"), trigger=$("colorFilterTrigger"); if(!pop||!trigger)return;
    const opening=pop.hidden;
    pop.hidden=!opening; trigger.setAttribute("aria-expanded",String(opening));
    if(opening) renderColors();
  }
  $("colorFilterTrigger")?.addEventListener("click",toggleColorPopover);
  $("colorFilterClose")?.addEventListener("click",closeColorPopover);
  document.addEventListener("click",e=>{
    const wrap=document.querySelector(".color-filter-wrap");
    if(wrap && !wrap.contains(e.target)) closeColorPopover();
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape") closeColorPopover();});

  $("subcategoryFilter").onchange=()=>{renderMechanicalSubcategories();renderDigitalSubcategories();renderAccessorySubcategories();renderHingeSubcategories();renderHandlesSubcategories();render();pushNavigationState("#catalogo",{filter:"subcategory"})};
  $("materialFilter").onchange=()=>{state.showAllCategory=false;render();pushNavigationState("#catalogo",{filter:"material"})};
  $("colorFilter").onchange=()=>{state.showAllCategory=false;renderColors();render();pushNavigationState("#catalogo",{filter:"color"})};
  $("clearFilters").onclick=()=>{$("searchInput").value="";$("categoryFilter").value="";$("brandFilter").value="";$("subcategoryFilter").value="";$("materialFilter").value="";$("colorFilter").value="";closeColorPopover();state.activeTag="";state.activeCategory="";state.digitalInstall="";state.accessorySubcategory="";state.hingeSubcategory="";state.hingeMaterialSubcategory="";state.hingeCornerSubcategory="";state.handlesType="";state.handlesSize="";state.mechanicalLockType="";state.mechanicalDoor="";state.menuProductFilter="";state.showAllCategory=true;renderSubcategories();renderMaterials();renderChips();renderMechanicalSubcategories();renderDigitalSubcategories();renderAccessorySubcategories();renderHingeSubcategories();renderHandlesSubcategories();renderCategoryShowAll();render();pushNavigationState("#catalogo",{filter:"clear"})};

  // Product modal
  function fillDL(target,data){
    target.innerHTML="";
    Object.entries(data||{}).forEach(([k,v])=>{const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=translateField(k);dd.textContent=translateValue(String(v));target.append(dt,dd)});
  }
  const fieldMap={Tipo:["Type","Tipo"],Fechamento:["Closing","Fechamento"],Abertura:["Access","Abertura"],Design:["Design","Design"],Diferencial:["Highlight","Diferencial"],Tecnologia:["Technology","Tecnologia"],Linha:["Line","Linha"],Alimentação:["Power","Alimentação"],Garantia:["Warranty","Garantia"],Aplicativo:["App","Aplicativo"],Conectividade:["Connectivity","Conectividade"],Capacidade:["Capacity","Capacidade"],Instalação:["Installation","Instalação"],Material:["Material","Material"],Acabamento:["Finish","Acabamento"],Indicação:["Recommended use","Indicação"],"Tipo de Instalação":["Installation type","Tipo de Instalação"],"Espessura da Porta":["Door thickness","Espessura da Porta"],"Tamanho de Máquina":["Lock case size","Tamanho de Máquina"]};
  function translateField(k){return state.lang==="pt"?k:(fieldMap[k]?.[0]||k)}
  function translateValue(v){
    if(state.lang==="pt")return v;
    const map={"Fechadura digital":"Digital lock","Fechadura eletrônica":"Electronic lock","Fechadura digital de embutir":"Digital mortise lock","Rolete magnético":"Magnetic roller","Biometria":"Biometrics","senha digital":"digital password","chave mecânica":"mechanical key","Aplicativo":"App","4 pilhas AA":"4 AA batteries","Preto fosco":"Matte black","Preto":"Black","Aço Inox":"Stainless steel","Aço Carbono":"Carbon steel","Fácil instalação":"Easy installation","Fechamento automático":"Automatic locking","Design moderno":"Modern design","Móveis":"Furniture","Embutir":"Mortise","Sobrepor":"Surface mounted"};
    let out=v; Object.entries(map).forEach(([a,b])=>out=out.replaceAll(a,b)); return out;
  }
  function openProductByHash(){
    const match = window.location.hash.match(/^#produto=([^&]+)/);
    if(!match){
      if($("productModal").classList.contains("open")) closeModal(true);
      const snapshot=history.state?.navigationSnapshot;
      if(snapshot && snapshot.version===NAV_STATE_VERSION) restoreNavigationState(snapshot,{scroll:true});
      if(snapshot?.returnToGeneralCategory && snapshot.ui?.activeCategory){
        const destination=$("catalogo");
        if(destination) requestAnimationFrame(()=>window.scrollTo({top:Math.max(0,destination.getBoundingClientRect().top+window.scrollY-92),behavior:"auto"}));
      }
      updateSiteBackButton();
      return;
    }
    const product = PRODUCTS.find(p => p.id === decodeURIComponent(match[1]));
    if(product) openProduct(product);
    updateSiteBackButton();
  }

  function navigateToProduct(p){
    if(!p) return;
    const target=`#produto=${encodeURIComponent(p.id)}`;

    // O estado anterior fica gravado na própria entrada do histórico.
    // Assim vários produtos podem ser abertos em sequência sem sobrescrever o retorno.
    const returnSnapshot=captureNavigationState();
    // Produto aberto de qualquer lugar retorna à categoria geral a que pertence,
    // em vez de retornar ao card da marca ou a uma subcategoria intermediária.
    returnSnapshot.hash="#catalogo";
    returnSnapshot.returnToGeneralCategory=true;
    returnSnapshot.scrollY=0;
    returnSnapshot.filters={search:"",category:"",brand:"",subcategory:"",material:"",color:""};
    returnSnapshot.ui={...(returnSnapshot.ui||{}),activeCategory:p.category||"",digitalInstall:"",accessorySubcategory:"",hingeSubcategory:"",hingeMaterialSubcategory:"",hingeCornerSubcategory:"",handlesType:"",handlesSize:"",mechanicalLockType:"",mechanicalDoor:"",menuProductFilter:"",activeTag:"",showAllCategory:true};
    if(window.location.hash!==target){
      const depth=(history.state?.siteNavigation ? Number(history.state.navigationDepth)||0 : 0)+1;
      history.pushState({siteNavigation:true,product:p.id,navigationDepth:depth,navigationSnapshot:returnSnapshot}, "", target);
      pushSiteNavigation(target);
    }
    openProduct(p);
    updateSiteBackButton();
  }

  
function renderProductSizeSelector(product){
  if(!product?.requiresSize || !Array.isArray(product.sizes)) return "";
  return `<div class="product-option product-size-option" data-required-size="true">
    <div class="product-option-title">${product.sizeLabel || "ESCOLHA O TAMANHO"} <span aria-hidden="true">*</span></div>
    <select class="product-size-select" required aria-label="${product.sizeLabel || "Escolha o tamanho"}">
      <option value="">Selecione o tamanho</option>
      ${product.sizes.map(size=>`<option value="${size}">${size}</option>`).join("")}
    </select>
  </div>`;
}

function renderProductGallery(images,name){
    const list=Array.isArray(images)&&images.length?images:[];
    $("modalImage").src=list[0]||"";$("modalImage").alt=name||"";
    $("modalThumbs").innerHTML="";
    list.forEach((src,i)=>{const b=document.createElement("button");b.type="button";b.className=i===0?"active":"";b.innerHTML=`<img loading="lazy" decoding="async" src="${src}" alt="Imagem ${i+1} de ${escapeHtml(name||"produto")}">`;b.onclick=()=>{$("modalImage").src=src;document.querySelectorAll(".thumbs button").forEach(x=>x.classList.remove("active"));b.classList.add("active")};$("modalThumbs").appendChild(b)});
  }
  function renderTechnicalVisuals(variant,p){
    const block=$("technicalVisualBlock"), wrap=$("technicalVisuals");
    if(!block || !wrap)return;
    const images=variant?.technicalImages || p.technicalImages || [];
    wrap.innerHTML=images.map((src,i)=>`<figure class="technical-visual" tabindex="0" role="button" data-technical-image="${escapeHtml(src)}"><img src="${src}" loading="lazy" decoding="async" alt="${escapeHtml(state.lang==="pt"?`Desenho técnico ${i+1} de ${p.name}`:`Technical drawing ${i+1} de ${p.name}`)}"><figcaption>${state.lang==="pt"?`Desenho técnico ${i+1}`:`Technical drawing ${i+1}`}</figcaption></figure>`).join("");
    block.hidden=!images.length;
    wrap.querySelectorAll("[data-technical-image]").forEach(item=>{
      const open=()=>openTechnicalFullscreen(item.dataset.technicalImage,item.querySelector("img")?.alt||"");
      item.addEventListener("click",open);
      item.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}});
    });
  }
  function openTechnicalFullscreen(src,alt=""){
    const modal=$("technicalFullscreen"), img=$("technicalFullscreenImage");
    if(!modal||!img||!src)return;
    img.src=src; img.alt=alt;
    modal.classList.add("open"); modal.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
  }
  function closeTechnicalFullscreen(){
    const modal=$("technicalFullscreen"), img=$("technicalFullscreenImage");
    if(!modal)return;
    modal.classList.remove("open"); modal.setAttribute("aria-hidden","true");
    if(img) img.src="";
    if(!$('productModal')?.classList.contains('open')) document.body.style.overflow="";
  }
  document.querySelectorAll("[data-technical-close]").forEach(el=>el.addEventListener("click",closeTechnicalFullscreen));
  function getProductVariantImages(p,c,size,furo){
    if(!p) return [];
    if(p.id === "puxador-concha-22cm" && c && furo){
      const variantImage=c.images?.[furo];
      if(variantImage) return [variantImage];
    }
    if((p.id === "puxador-tipo-u-50x20-2m" || p.id === "puxador-tipo-u-50x20-1-8m" || p.id === "puxador-u-50x20-1-5m" || p.id === "puxador-u-50x20-1-2m") && c){
      const primeiro = c.images?.principal || c.cover;
      const segundo = c.images?.detalhe;
      const variantImages = [primeiro, segundo].filter(Boolean);
      if(variantImages.length) return variantImages;
    }
    if(p.id === "veda-frestas-6m-adesivo" && c){
      const colorName=String(c.name||"").trim().toLowerCase();
      const prefix=colorName === "preto" ? "PRETO" : colorName === "branco" ? "BRANCO" : colorName === "marrom" ? "MARROM" : "";
      if(prefix){
        const base="Todas as Imagens/Produtos/accessories/veda-frestas-6m-adesivo/";
        const capa6=base+prefix+"_VARIANTE_6X9_GORDINHO.png";
        const capa2=base+prefix+"_VARIANTE_2X9_ACHATADO.png";
        const img2=base+prefix+"_VARIANTE_IMAGEM_2.png";
        if(size === "6 × 9") return [capa6,img2];
        if(size === "2 × 9") return [capa2,img2];
        return [capa6,capa2,img2];
      }
    }
    if(!c) return p.images || [];
    if(size && c.sizeImages && Array.isArray(c.sizeImages[size])) return c.sizeImages[size];
    if(c.images && typeof c.images === "object" && !Array.isArray(c.images)){
      const objectImages=Object.values(c.images).filter(Boolean);
      if(objectImages.length) return objectImages;
    }
    const colorCover=getColorCover(c);
    return colorCover ? [colorCover] : (p.images || []);
  }
  function applyProductColor(p,c){
    state.selectedColor=c||null;
    const variant=c||{};
    renderProductGallery(getProductVariantImages(p,variant,state.selectedSize,state.selectedFuro),p.name);
    fillDL($("basicInfo"),variant.basic||p.basic);
    fillDL($("technicalInfo"),variant.technical||p.technical);
    renderTechnicalVisuals(variant,p);
    // O nome da cor selecionada não é exibido separadamente.
    // A seleção fica indicada somente pela própria bolinha ativa.
    const block=$("selectedColorInfo");
    if(block){block.innerHTML="";block.hidden=true;}
    document.querySelectorAll(".color-swatch").forEach(x=>{const active=x.dataset.color===variant.name;x.classList.toggle("active",active);x.setAttribute("aria-pressed",String(active));});
  }
  function renderProductFuroOptions(p){
    const block=$("furoBlock"), wrap=$("furoOptions"), info=$("selectedFuroInfo");
    if(!block || !wrap)return;
    const options=Array.isArray(p.furoOptions)?p.furoOptions:[];
    const required=!!p.requiresFuro;
    block.hidden=!required;
    wrap.innerHTML="";
    state.selectedFuro=null;
    if(info)info.textContent="";
    if(!required)return;
    options.forEach(option=>{
      const b=document.createElement("button");
      b.type="button"; b.className="furo-option"; b.dataset.furo=option.key;
      b.setAttribute("role","radio"); b.setAttribute("aria-checked","false"); b.textContent=option.name;
      b.onclick=()=>{
        state.selectedFuro=option.key;
        wrap.querySelectorAll(".furo-option").forEach(x=>{const active=x===b;x.classList.toggle("active",active);x.setAttribute("aria-checked",String(active));});
        if(info)info.textContent=`Modelo selecionado: ${option.name}`;
        if(state.currentProduct && state.selectedColor){
          renderProductGallery(getProductVariantImages(state.currentProduct,state.selectedColor,state.selectedSize,state.selectedFuro),state.currentProduct.name);
        }
      };
      wrap.appendChild(b);
    });
  }
  function renderProductSizeOptions(p){
    const block=$("sizeBlock"), wrap=$("sizeOptions"), info=$("selectedSizeInfo");
    if(!block || !wrap)return;
    const sizes=Array.isArray(p.sizes)?p.sizes:[];
    const required=!!p.requiresSize;
    block.hidden=!required;
    wrap.innerHTML="";
    state.selectedSize=null;
    if(info)info.textContent="";
    if(!required)return;
    sizes.forEach(size=>{
      const b=document.createElement("button");
      b.type="button"; b.className="size-option"; b.dataset.size=size;
      b.setAttribute("role","radio"); b.setAttribute("aria-checked","false"); b.textContent=size;
      b.onclick=()=>{
        state.selectedSize=size;
        wrap.querySelectorAll(".size-option").forEach(x=>{const active=x===b;x.classList.toggle("active",active);x.setAttribute("aria-checked",String(active));});
        if(info)info.textContent=`Tamanho selecionado: ${size}`;
        if(state.currentProduct && state.selectedColor){
          renderProductGallery(getProductVariantImages(state.currentProduct,state.selectedColor,size,state.selectedFuro),state.currentProduct.name);
        }
      };
      wrap.appendChild(b);
    });
  }
  function openProduct(p){
    state.currentProduct=p;
    const productModal=$("productModal");
    /* Sempre abre o modal no topo, evitando que a posição de scroll anterior
       empurre a galeria do produto para baixo. */
    productModal.scrollTop=0;
    const modalInfo=productModal.querySelector(".modal-info");
    if(modalInfo) modalInfo.scrollTop=0;
    productModal.classList.toggle("product-modal--dobradica-sobrepor-carbono",p?.id==="dobradica-3-5x2-5-sobrepor-carbono-dss");
    productModal.classList.toggle("product-modal--u50x20",p?.id==="puxador-tipo-u-50x20-2m" || p?.id==="puxador-tipo-u-50x20-1-8m" || p?.id==="puxador-u-50x20-1-5m" || p?.id==="puxador-u-50x20-1-2m");
    $("modalBrand").textContent=p.brand;$("modalTitle").textContent=p.name;
    $("modalDescription").textContent=state.lang==="en"?translateValue(p.description):p.description;
    const colors=(p.colors||[]); $("colorBlock").hidden=!colors.length; $("colorSwatches").innerHTML="";
    colors.forEach(c=>{
      const item=document.createElement("div");
      item.className="color-option";
      item.dataset.color=c.name;
      const b=document.createElement("button");
      b.type="button";
      b.className="color-swatch";
      b.dataset.color=c.name;
      b.style.setProperty("--swatch",c.swatch||c.hex||"#888");
      b.title=c.name;
      b.setAttribute("aria-label",`Selecionar cor ${c.name}`);
      b.setAttribute("aria-pressed","false");
      b.innerHTML='<span class="color-swatch-dot" aria-hidden="true"></span>';
      b.onclick=()=>applyProductColor(p,c);
      const label=document.createElement("span");
      label.className="color-name";
      label.textContent=c.name;
      item.appendChild(b);
      item.appendChild(label);
      $("colorSwatches").appendChild(item);
    });
    // HATO 2 Externa e Bine Externa: ao abrir o produto, a primeira variante exibida é
    // obrigatoriamente o Inox Polido (a mesma imagem usada na capa do card).
    // As bolinhas seguem exatamente as variantes cadastradas e, ao clicar,
    // a galeria troca para a imagem correspondente daquela cor.
    state.selectedFuro=null;
    const initialColor = (p.id === "fechadura-hato-2-externa-inox-55mm-imab" || p.id === "fechadura-imab-bine-externa-inox" || p.id === "fechadura-luma-externa-roseta-redonda-pado-2")
      ? ((p.colors||[]).find(c => String(c.name).trim().toLowerCase() === "polido") || colors[0] || null)
      : null;
    state.selectedColor=initialColor;
    document.querySelectorAll("#colorSwatches .color-swatch").forEach(x=>{
      const active=!!initialColor && x.dataset.color===initialColor.name;
      x.classList.toggle("active",active);
      x.setAttribute("aria-pressed",String(active));
    });
    renderProductGallery(initialColor ? getProductVariantImages(p,initialColor,state.selectedSize,state.selectedFuro) : (p.images||[]),p.name);
    if(initialColor){
      fillDL($("basicInfo"),initialColor.basic||p.basic);
      fillDL($("technicalInfo"),initialColor.technical||p.technical);
      renderTechnicalVisuals(initialColor,p);
    }
    fillDL($("basicInfo"),p.basic);
    fillDL($("technicalInfo"),p.technical);
    if($("technicalInfoBlock")) $("technicalInfoBlock").hidden=true;
    $("viewTechnicalBtn").textContent=state.lang==="pt" ? "Ver Informações Técnicas" : "View Technical Information";
    // Sempre renderiza os desenhos técnicos ao abrir o produto, inclusive para produtos sem variações de cor.
    renderTechnicalVisuals(null,p);
    renderProductFuroOptions(p);
    const selectedColorInfo=$("selectedColorInfo");
    if(selectedColorInfo){selectedColorInfo.innerHTML="";selectedColorInfo.hidden=true;}
    renderProductSizeOptions(p);
    $("includedInfo").innerHTML=(p.included||[]).map(x=>`<li>${escapeHtml(translateValue(x))}</li>`).join("");
    $("includedBlock").style.display=p.included?.length?"":"none";
    $("productModal").classList.add("open");$("productModal").setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
  }
  function closeModal(fromHistory=false){
    $("productModal").classList.remove("open","product-modal--dobradica-sobrepor-carbono","product-modal--u50x20");
    $("productModal").setAttribute("aria-hidden","true");
    document.body.style.overflow="";
    if(!fromHistory && /^#produto=/.test(window.location.hash)){
      history.back();
    }
  }

  function goBackFromProduct(){
    const current=history.state;
    const snapshot=current?.navigationSnapshot;
    if(/^#produto=/.test(window.location.hash) && snapshot && current?.returnToGeneralCategory){
      closeModal(true);
      const parent={...snapshot};
      parent.hash="#catalogo";
      parent.returnToGeneralCategory=false;
      restoreNavigationState(parent,{scroll:false});
      document.querySelectorAll('.brand-showcase').forEach(el=>el.hidden=true);
      const destination=$("catalogo");
      const headerH=(document.querySelector('.site-header')?.getBoundingClientRect().height||92);
      const y=destination?Math.max(0,destination.getBoundingClientRect().top+window.scrollY-headerH):Number(parent.scrollY)||0;
      parent.scrollY=y;
      history.replaceState({siteNavigation:true,menuFilter:"all",navigationDepth:Math.max(0,(Number(current.navigationDepth)||1)-1),navigationSnapshot:parent},"","#catalogo");
      markProgrammaticAreaNavigation(1300);
      requestAnimationFrame(()=>window.scrollTo({top:y,behavior:"auto"}));
      syncActiveSiteAreaFromHash("#catalogo");
      updateSiteBackButton();
      return;
    }
    if(/^#produto=/.test(window.location.hash) && current?.siteNavigation && (Number(current.navigationDepth)||0)>0){
      history.back();
      return;
    }
    closeModal(true);
    const fallback={version:NAV_STATE_VERSION,hash:"#catalogo",scrollY:0,filters:{search:"",category:"",brand:"",subcategory:"",material:"",color:""},ui:{activeCategory:"",digitalInstall:"",accessorySubcategory:"",hingeSubcategory:"",hingeMaterialSubcategory:"",hingeCornerSubcategory:"",handlesType:"",handlesSize:"",mechanicalLockType:"",mechanicalDoor:"",menuProductFilter:"",activeTag:"",showAllCategory:true}};
    restoreNavigationState(fallback,{scroll:true});
    history.replaceState({siteNavigation:true,menuFilter:"all",navigationDepth:0,navigationSnapshot:fallback},"","#catalogo");
    updateSiteBackButton();
  }

  $("productBackButton").onclick=goBackFromProduct;
  document.querySelectorAll("[data-close]").forEach(x=>x.onclick=closeModal);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){if($("technicalFullscreen")?.classList.contains("open")) closeTechnicalFullscreen(); else closeModal()}});
  let productQty=1;
  function setProductQty(value){productQty=Math.max(1,parseInt(value,10)||1);const el=$("productQtyValue");if(el)el.textContent=productQty}
  $("productQtyMinus").onclick=()=>setProductQty(productQty-1);
  $("productQtyPlus").onclick=()=>setProductQty(productQty+1);
  $("viewTechnicalBtn").onclick=()=>{
    const infoBlock=$("technicalInfoBlock");
    const visualBlock=$("technicalVisualBlock");
    const btn=$("viewTechnicalBtn");
    const showing=!!infoBlock && !infoBlock.hidden;
    if(infoBlock) infoBlock.hidden=showing;
    if(visualBlock && (visualBlock.querySelector("img") || visualBlock.querySelector("figure"))) visualBlock.hidden=showing;
    if(btn){
      btn.textContent=showing ? (state.lang==="pt" ? "Ver Informações Técnicas" : "View Technical Information") : (state.lang==="pt" ? "Ocultar Informações Técnicas" : "Hide Technical Information");
    }
    const target=showing ? $("modalTitle") : (infoBlock || visualBlock);
    target?.scrollIntoView({behavior:"smooth",block:"start"});
  };
  $("addToQuote").onclick=()=>{
    if(!state.currentProduct)return;
    if((state.currentProduct.requiresColor || (Array.isArray(state.currentProduct.colors) && state.currentProduct.colors.length>0)) && !state.selectedColor){
      const block=$("colorSwatches")?.closest(".product-colors") || $("colorSwatches");
      if(block) block.scrollIntoView({behavior:"smooth",block:"center"});
      alert("Selecione a cor do produto.");
      return;
    }
    if(state.currentProduct.requiresFuro && !state.selectedFuro){
      const block=$("furoBlock");
      if(block){block.hidden=false;block.scrollIntoView({behavior:"smooth",block:"center"});}
      alert("Selecione se deseja o produto com furo ou sem furo.");
      return;
    }
    if(state.currentProduct.requiresSize && !state.selectedSize){
      const block=$("sizeBlock");
      if(block){block.hidden=false;block.scrollIntoView({behavior:"smooth",block:"center"});}
      alert(`Escolha o tamanho de "${state.currentProduct.name}" antes de adicionar ao orçamento.`);
      return;
    }
    const color=state.selectedColor;
    const size=state.selectedSize||"";
    const furo=state.selectedFuro||"";
    const existing=state.cart.find(x=>x.id===state.currentProduct.id && (x.colorName||"") === (color?.name||"") && (x.size||"")===size && (x.furo||"")===furo);
    if(existing) existing.qty=(parseInt(existing.qty,10)||0)+productQty;
    else state.cart.push({id:state.currentProduct.id,qty:productQty,colorName:color?.name||"",colorCode:color?.code||"",size,furo});
    saveCart();
    renderCart();
    showCartAddedNotice(productQty);
    setProductQty(1);
    closeModal();
    $("orcamento").scrollIntoView({behavior:"smooth"});
  };

  // Quote cart / WhatsApp
  function saveCart(){
    state.cart=state.cart.map(normalizeCartItem).filter(x=>x.id);
    localStorage.setItem(state.cartStorageKey,JSON.stringify(state.cart));
  }
  function setCartOwner(userId,options={}){
    const nextKey=cartStorageKey(userId||"guest");
    if(nextKey===state.cartStorageKey) return;
    const guestKey=CART_GUEST_KEY;
    const existing=readCart(nextKey);
    const guest=options.mergeGuest ? readCart(guestKey) : [];
    state.cart=mergeCarts(existing,guest);
    state.cartOwnerId=userId||null;
    state.cartStorageKey=nextKey;
    saveCart();
    if(options.mergeGuest && guest.length && nextKey!==guestKey) localStorage.removeItem(guestKey);
    renderCart();
  }
  function getCartItemVariant(item){
    const p=PRODUCTS_BY_ID.get(item.id);
    if(!p)return null;
    return item.colorName ? (p.colors||[]).find(c=>normalize(c?.name||"")===normalize(item.colorName)) || null : null;
  }
  function getCartItemImage(item){
    const p=PRODUCTS_BY_ID.get(item.id);
    if(!p)return "";
    const variant=getCartItemVariant(item);
    if(item.furo && variant?.images && !Array.isArray(variant.images)){
      return variant.images[item.furo] || getColorCover(variant) || p.cover || p.images?.[0] || "";
    }
    return getColorCover(variant) || p.cover || p.images?.[0] || "";
  }
  function getCartItemImages(item){
    const p=PRODUCTS_BY_ID.get(item.id);
    if(!p)return [];
    const variant=getCartItemVariant(item);
    if(item.furo && variant?.images && !Array.isArray(variant.images)){
      const selected=variant.images[item.furo];
      return selected ? [selected] : [];
    }
    const images=Array.isArray(variant?.images) && variant.images.length ? variant.images : (variant?.image ? [variant.image] : (p.images||[]));
    return [...new Set(images.filter(Boolean))];
  }
  function renderCart(){
    const wrap=$("cartItems");wrap.innerHTML="";let total=0;
    state.cart.forEach((item,index)=>{
      const p=PRODUCTS_BY_ID.get(item.id);if(!p)return;
      item.qty=Math.max(1,parseInt(item.qty,10)||1); total+=item.qty;
      const row=document.createElement("div");row.className="cart-row";
      const colorLine=item.colorName?`<small>${state.lang==="pt"?"Cor":"Color"}: ${escapeHtml(item.colorName)}</small>`:"";
      const sizeLine=item.size?`<small>${state.lang==="pt"?"Tamanho":"Size"}: ${escapeHtml(item.size)}</small>`:"";
      const furoLine=item.furo?`<small>Modelo: ${escapeHtml(item.furo==="com-furo"?"Com furo":"Sem furo")}</small>`:"";
      const material=p.material||p.basic?.Material||p.technical?.Material||"";
      const materialLine=material?`<small>${state.lang==="pt"?"Material":"Material"}: ${escapeHtml(material)}</small>`:"";
      row.innerHTML=`<img src="${getCartItemImage(item)}" alt="${escapeHtml(p.name)}${item.colorName?` - ${escapeHtml(item.colorName)}`:""}">
        <div class="cart-product-info"><strong>${escapeHtml(p.name)}</strong>${colorLine}${furoLine}${sizeLine}${materialLine}
          <small class="cart-quantity-label">${state.lang==="pt"?"Quantidade":"Quantity"}: <b>${item.qty}</b></small>
          <div class="cart-qty-control">
            <button type="button" class="cart-qty-minus" aria-label="Diminuir quantidade">−</button>
            <span>${item.qty}</span>
            <button type="button" class="cart-qty-plus" aria-label="Aumentar quantidade">+</button>
          </div>
        </div>
        <button class="remove-cart" aria-label="Remove">×</button>`;
      row.querySelector(".cart-qty-minus").onclick=()=>{item.qty=Math.max(1,item.qty-1);saveCart();renderCart()};
      row.querySelector(".cart-qty-plus").onclick=()=>{item.qty+=1;saveCart();renderCart()};
      row.querySelector(".remove-cart").onclick=()=>{state.cart=state.cart.filter((_,i)=>i!==index);saveCart();renderCart()};
      wrap.appendChild(row);
    });
    $("cartCount").textContent=total;
    $("cartEmpty").style.display=state.cart.length?"none":"block";
    $("requestQuote").disabled=!state.cart.length;
  }
  function goToQuoteCart(){
    const cart=document.getElementById("orcamento");
    if(!cart)return;
    if(window.location.hash!=="#orcamento") pushNavigationState("#orcamento",{quote:true});
    else updateNavigationSnapshot();
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>cart.scrollIntoView({behavior:"smooth",block:"start"}));
    });
  }

  function showCartAddedNotice(qty){
    let el=document.getElementById("cartAddedNotice");
    if(!el){
      el=document.createElement("div");
      el.id="cartAddedNotice";
      el.className="budget-cart-toast";
      el.innerHTML=`<span class="check">✓</span><span class="cart-added-message"></span><button type="button" class="cart-added-view">Visualizar carrinho</button>`;
      document.body.appendChild(el);
      el.querySelector(".cart-added-view").onclick=(event)=>{
        event.preventDefault();
        event.stopPropagation();
        el.classList.remove("show");
        goToQuoteCart();
      };
    }
    el.querySelector(".cart-added-message").textContent=(qty>1?qty+" unidades adicionadas ao orçamento":"Produto adicionado ao orçamento");
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer=setTimeout(()=>el.classList.remove("show"),5000);
  }
  $("continueShopping").onclick=()=>{
    if(window.location.hash!=="#catalogo") pushNavigationState("#catalogo",{quoteContinue:true});
    else updateNavigationSnapshot();
    scrollToHashTarget("#catalogo");
    updateSiteBackButton();
  };
  async function getQuoteImageFiles(){
    const files=[];
    for(let i=0;i<state.cart.length;i++){
      const item=state.cart[i],p=PRODUCTS_BY_ID.get(item.id); if(!p)continue;
      const images=getCartItemImages(item);
      // Envia as imagens da variação escolhida. Assim, a foto anexada acompanha
      // exatamente a cor selecionada no carrinho.
      for(let j=0;j<images.length;j++){
        const src=images[j];
        try{
          const response=await fetch(src); if(!response.ok)continue;
          const blob=await response.blob();
          const ext=(blob.type.split("/")[1]||"jpg").replace("jpeg","jpg");
          files.push(new File([blob],`designer-fechaduras-${item.id}-${i+1}-${j+1}.${ext}`,{type:blob.type||"image/jpeg"}));
        }catch(err){console.warn("Não foi possível preparar a imagem do produto.",err)}
      }
    }
    return files;
  }
  let quoteRequestInFlight=false;
  let pendingQuoteRequest=false;
  let pendingCustomerType="Novo cliente";
  let pendingCustomerName="";

  function buildLocalWhatsAppMessage(){
    const blocks=state.cart.map(item=>{
      const p=PRODUCTS_BY_ID.get(item.id);
      if(!p)return null;
      const lines=[p.name];
      if(item.colorName) lines.push(`• Cor/Acabamento: ${item.colorName}`);
      if(p.brand) lines.push(`• Marca: ${p.brand}`);
      const material=p.material||p.basic?.Material||p.technical?.Material||"";
      const finish=p.finish||p.basic?.Acabamento||p.technical?.Acabamentos||"";
      const extra=[material,finish,item.size,item.furo].filter(Boolean).map(String);
      if(extra.length) lines.push(`• Mais especificações: ${[...new Set(extra)].join(" · ")}`);
      lines.push(`• Quantidade: ${item.qty}`);
      return lines.join("\n");
    }).filter(Boolean).join("\n\n");

    return `Olá! Conheci a Designer Fechaduras através do site de vocês e gostaria de solicitar um orçamento.\n\n📋 Orçamento solicitado:\n\n${blocks}\n\n👤 Cliente: ${pendingCustomerType}\nNome: ${pendingCustomerName}\n\nAguardo o orçamento. Obrigado!`;
  }

  async function submitQuoteRequest(){
    if(quoteRequestInFlight || !state.cart.length)return false;
    quoteRequestInFlight=true;
    const button=$("requestQuote");
    const oldText=button.textContent;
    button.disabled=true;
    button.textContent="Preparando orçamento…";
    try{
      const number=String(window.WHATSAPP_NUMBER||"").replace(/\D/g,"");
      const message=buildLocalWhatsAppMessage();
      if(!number || !message)throw new Error("Não foi possível preparar o WhatsApp para este orçamento.");
      localStorage.removeItem(CART_GUEST_KEY);
      state.cart=[];
      renderCart();
      const whatsappUrl=`https://wa.me/${number}?text=${encodeURIComponent(message)}`;
      window.location.assign(whatsappUrl);
      return true;
    }catch(err){
      button.textContent=oldText;
      button.disabled=false;
      alert(err.message||"Não foi possível gerar o orçamento agora. Tente novamente.");
      return false;
    }finally{
      quoteRequestInFlight=false;
    }
  }

  $("requestQuote").onclick=async()=>{
    if(!state.cart.length)return;
    const missingColor=state.cart.find(item=>{
      const p=PRODUCTS_BY_ID.get(item.id);
      return (p?.requiresColor || (Array.isArray(p?.colors) && p.colors.length>0)) && !item.colorName;
    });
    if(missingColor){alert("Selecione a cor do produto.");return;}
    const missingFuro=state.cart.find(item=>{
      const p=PRODUCTS_BY_ID.get(item.id);
      return p?.requiresFuro && !item.furo;
    });
    if(missingFuro){alert("Selecione se deseja o produto com furo ou sem furo.");return;}
    const missingSize=state.cart.find(item=>{
      const p=PRODUCTS_BY_ID.get(item.id);
      return p?.requiresSize && !item.size;
    });
    if(missingSize){
      alert(`Escolha o tamanho do produto "${PRODUCTS_BY_ID.get(missingSize.id)?.name||""}" antes de fazer o orçamento.`);
      return;
    }
    pendingQuoteRequest=true;
    pendingCustomerType="Novo cliente";
    pendingCustomerName="";
    openAuth("choice");
  };

  function setAuthStatus(message,type=""){
    const el=$("authStatus");
    if(el){el.textContent=message;el.className="auth-status"+(type?" "+type:"");}
  }
  function openAuth(view="choice"){
    $("authModal").classList.add("open");
    $("authModal").setAttribute("aria-hidden","false");
    showAuthView(view);
    document.body.style.overflow="hidden";
  }
  function closeAuth(){
    $("authModal").classList.remove("open");
    $("authModal").setAttribute("aria-hidden","true");
    document.body.style.overflow="";
    setAuthStatus("");
  }
  function showAuthView(view){
    $("authChoice").hidden=view!=="choice";
    $("loginForm").hidden=view!=="login";
    $("registerForm").hidden=view!=="register";
    $("authWelcome").hidden=view!=="welcome";
    $("authTitle").textContent=({choice:"Como deseja continuar?",login:"Já sou cliente.",register:"Sou novo por aqui.",welcome:"Tudo certo."})[view]||"Como deseja continuar?";
    setAuthStatus("");
  }
  function showAuthWelcome(customerType){
    pendingCustomerType=customerType==="Cliente antigo"?"Cliente antigo":"Novo cliente";
    $("authWelcomeEyebrow").textContent=pendingCustomerType==="Cliente antigo"?"CLIENTE ANTIGO":"NOVO CLIENTE";
    $("authWelcomeTitle").textContent=pendingCustomerType==="Cliente antigo"?"Seja bem-vindo de volta!":"Seja bem-vindo!";
    $("authWelcomeText").textContent="Tudo pronto. Clique em continuar para abrir o WhatsApp com seu orçamento.";
    showAuthView("welcome");
  }

  function updateAccountButton(){
    const btn=$("accountBtn");
    if(btn)btn.textContent="Minha conta";
  }
  $("accountBtn").onclick=()=>openAuth("choice");
  document.querySelectorAll("[data-auth-close]").forEach(el=>el.onclick=closeAuth);
  document.querySelectorAll("[data-auth-view]").forEach(b=>b.onclick=()=>showAuthView(b.dataset.authView));
  updateAccountButton();

  // Profile photo cropper: visible workspace with a circular crop guide.
  const photoCrop={img:null,x:0,y:0,zoom:1,baseScale:1,stage:0,cropSize:0,naturalW:0,naturalH:0,dragging:false,startX:0,startY:0,startImgX:0,startImgY:0};
  function clampCropPosition(){
    const displayW=photoCrop.naturalW*photoCrop.baseScale*photoCrop.zoom, displayH=photoCrop.naturalH*photoCrop.baseScale*photoCrop.zoom;
    const maxX=Math.max(0,(displayW-photoCrop.cropSize)/2), maxY=Math.max(0,(displayH-photoCrop.cropSize)/2);
    photoCrop.x=Math.max(-maxX,Math.min(maxX,photoCrop.x));
    photoCrop.y=Math.max(-maxY,Math.min(maxY,photoCrop.y));
  }
  function updateCropPreview(){
    if(!photoCrop.img)return;
    clampCropPosition();
    const scale=photoCrop.baseScale*photoCrop.zoom;
    photoCrop.img.style.transform=`translate(-50%,-50%) translate(${photoCrop.x}px,${photoCrop.y}px) scale(${scale})`;
  }
  function openPhotoCrop(dataUrl){
    const modal=$("photoCropModal"), img=$("photoCropImage"), stage=$("photoCropStage"), zoom=$("photoCropZoom");
    modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
    photoCrop.img=img; photoCrop.stage=stage.clientWidth || 360; photoCrop.cropSize=photoCrop.stage*0.78;
    photoCrop.x=0; photoCrop.y=0; photoCrop.zoom=1; zoom.value="1";
    $("photoCropLoading").style.display="flex";
    img.onload=()=>{
      photoCrop.naturalW=img.naturalWidth; photoCrop.naturalH=img.naturalHeight;
      photoCrop.baseScale=Math.max(photoCrop.cropSize/photoCrop.naturalW,photoCrop.cropSize/photoCrop.naturalH);
      $("photoCropLoading").style.display="none";
      updateCropPreview();
    };
    img.onerror=()=>{$("photoCropLoading").textContent="Não foi possível carregar a foto"};
    img.src=dataUrl;
  }
  function closePhotoCrop(){
    const modal=$("photoCropModal"); modal.classList.remove("open"); modal.setAttribute("aria-hidden","true");
    $("photoCropImage").src=""; photoCrop.img=null;
    if(!$("profileModal")?.classList.contains("open") && !$("authModal")?.classList.contains("open"))document.body.style.overflow="";
  }
  function exportCroppedPhoto(){
    if(!photoCrop.img || !photoCrop.naturalW)return null;
    const size=512, scale=photoCrop.baseScale*photoCrop.zoom, sourceSide=photoCrop.cropSize/scale;
    let sx=(photoCrop.naturalW-sourceSide)/2-photoCrop.x/scale;
    let sy=(photoCrop.naturalH-sourceSide)/2-photoCrop.y/scale;
    const maxSX=Math.max(0,photoCrop.naturalW-sourceSide), maxSY=Math.max(0,photoCrop.naturalH-sourceSide);
    sx=Math.max(0,Math.min(maxSX,sx)); sy=Math.max(0,Math.min(maxSY,sy));
    const side=Math.min(sourceSide,photoCrop.naturalW,photoCrop.naturalH);
    const canvas=document.createElement("canvas"); canvas.width=size; canvas.height=size;
    const ctx=canvas.getContext("2d"); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality="high";
    ctx.save(); ctx.beginPath(); ctx.arc(size/2,size/2,size/2,0,Math.PI*2); ctx.clip();
    ctx.drawImage(photoCrop.img,sx,sy,side,side,0,0,size,size); ctx.restore();
    return canvas.toDataURL("image/jpeg",.9);
  }
  $("profilePhotoInput").onchange=e=>{
    const file=e.target.files?.[0]; if(!file)return;
    if(!file.type.startsWith("image/"))return;
    if(file.size>8*1024*1024){$("profileStatus").textContent="Escolha uma imagem de até 8 MB.";e.target.value="";return}
    const reader=new FileReader(); reader.onload=()=>openPhotoCrop(reader.result); reader.readAsDataURL(file);
    e.target.value="";
  };
  $("photoCropZoom").oninput=e=>{photoCrop.zoom=Number(e.target.value);updateCropPreview()};
  const cropStage=$("photoCropStage");
  cropStage.addEventListener("pointerdown",e=>{
    if(!photoCrop.img)return; photoCrop.dragging=true; cropStage.classList.add("dragging"); cropStage.setPointerCapture(e.pointerId);
    photoCrop.startX=e.clientX; photoCrop.startY=e.clientY; photoCrop.startImgX=photoCrop.x; photoCrop.startImgY=photoCrop.y;
  });
  cropStage.addEventListener("pointermove",e=>{if(!photoCrop.dragging)return;photoCrop.x=photoCrop.startImgX+e.clientX-photoCrop.startX;photoCrop.y=photoCrop.startImgY+e.clientY-photoCrop.startY;updateCropPreview()});
  cropStage.addEventListener("pointerup",()=>{photoCrop.dragging=false;cropStage.classList.remove("dragging")});
  cropStage.addEventListener("pointercancel",()=>{photoCrop.dragging=false;cropStage.classList.remove("dragging")});
  document.querySelectorAll("[data-photo-crop-close]").forEach(el=>el.onclick=closePhotoCrop);
  $("saveCroppedPhoto").onclick=()=>{const photo=exportCroppedPhoto();if(photo){persistProfilePhoto(photo);closePhotoCrop()}};
  $("removeProfilePhoto").onclick=()=>persistProfilePhoto("");
  document.querySelectorAll("[data-auth-close]").forEach(el=>el.onclick=closeAuth);
  document.querySelectorAll("[data-auth-view]").forEach(b=>b.onclick=()=>showAuthView(b.dataset.authView));

  $("loginForm").onsubmit=e=>{
    e.preventDefault();
    const name=$("loginName").value.trim();
    if(name.length<3){setAuthStatus("Digite seu nome completo.","error");return;}
    pendingCustomerName=name;
    $("loginName").value="";
    showAuthWelcome("Cliente antigo");
  };

  $("registerForm").onsubmit=e=>{
    e.preventDefault();
    const name=$("registerName").value.trim();
    if(name.length<3){setAuthStatus("Digite seu nome completo.","error");return;}
    pendingCustomerName=name;
    $("registerName").value="";
    showAuthWelcome("Novo cliente");
  };

  $("authWelcomeContinue").onclick=async()=>{
    const button=$("authWelcomeContinue");
    if(pendingQuoteRequest && state.cart.length){
      button.disabled=true;
      button.textContent="Abrindo WhatsApp…";
      pendingQuoteRequest=false;
      const ok=await submitQuoteRequest();
      if(!ok){
        button.disabled=false;
        button.textContent="Continuar para o orçamento";
      }
    }else{
      closeAuth();
    }
  };

  $("logoutBtn").onclick=()=>{
    pendingCustomerName="";
    pendingCustomerType="Novo cliente";
    pendingQuoteRequest=false;
    closeAuth();
    const profileModal=$("profileModal");
    if(profileModal){profileModal.classList.remove("open");profileModal.setAttribute("aria-hidden","true");}
    updateAccountButton();
  };

  // Header
  const headerSearchPanel=$("headerSearchPanel"), headerSearchInput=$("headerSearchInput"), headerSearchClose=$("headerSearchClose"), searchBtn=$("searchBtn");
  const openHeaderSearch=()=>{if(!headerSearchPanel)return;headerSearchPanel.hidden=false;requestAnimationFrame(()=>headerSearchPanel.classList.add("is-open"));searchBtn?.setAttribute("aria-expanded","true");if(headerSearchInput){headerSearchInput.value=$("searchInput")?.value||"";headerSearchInput.focus()}};
  const closeHeaderSearch=()=>{if(!headerSearchPanel)return;headerSearchPanel.classList.remove("is-open");searchBtn?.setAttribute("aria-expanded","false");setTimeout(()=>{headerSearchPanel.hidden=true},180)};
  searchBtn?.addEventListener("click",()=>headerSearchPanel?.hidden?openHeaderSearch():closeHeaderSearch());
  headerSearchClose?.addEventListener("click",closeHeaderSearch);
  headerSearchInput?.addEventListener("input",()=>applyGlobalSearchQuery(headerSearchInput.value));
  headerSearchInput?.addEventListener("keydown",e=>{if(e.key==="Escape")closeHeaderSearch();if(e.key==="Enter"){closeHeaderSearch();$("catalogo")?.scrollIntoView({behavior:"smooth",block:"start"})}});
  $("menuBtn").onclick=()=>document.querySelector(".desktop-nav").classList.toggle("mobile-open");
  let scrollStopTimer=0,scrollRaf=0;
  const siteHeader=document.querySelector(".site-header");
  const paintScrollState=()=>{
    scrollRaf=0;
    siteHeader?.classList.toggle("scrolled",window.scrollY>20);
    updateSiteBackButton();
  };
  window.addEventListener("scroll",()=>{
    document.documentElement.classList.add("is-scrolling");
    if(!scrollRaf)scrollRaf=requestAnimationFrame(paintScrollState);
    clearTimeout(scrollStopTimer);
    scrollStopTimer=setTimeout(()=>document.documentElement.classList.remove("is-scrolling"),120);
  },{passive:true});
  paintScrollState();

  // Navegação interna: todos os links de seções funcionam como páginas do site,
  // mantendo o histórico do navegador para que a seta "Voltar" retorne à página anterior.
  function scrollToHashTarget(hash){
    if(!hash || /^#produto=/.test(hash)) return;
    const id=decodeURIComponent(hash.slice(1));
    const target=document.getElementById(id);
    if(target){
      markProgrammaticAreaNavigation(1300);
      requestAnimationFrame(()=>target.scrollIntoView({behavior:"smooth",block:"start"}));
    }
    document.querySelector(".desktop-nav")?.classList.remove("mobile-open");
  }

  function goToHome(){
    // Início e logo funcionam como um verdadeiro reinício da navegação visual:
    // fecham showcases/modais, limpam filtros e voltam ao primeiro estado do site.
    // O carrinho NÃO é tocado: ele permanece em state.cart e no localStorage.
    document.querySelectorAll('.brand-showcase').forEach(el=>{el.hidden=true;});
    try{ closeModal(true); }catch{}
    state.activeTag=""; state.activeCategory=""; state.digitalInstall="";
    state.accessorySubcategory=""; state.hingeSubcategory=""; state.hingeMaterialSubcategory="";
    state.hingeCornerSubcategory=""; state.handlesType=""; state.handlesSize="";
    state.mechanicalLockType=""; state.mechanicalDoor=""; state.menuProductFilter="";
    state.showAllCategory=true; state.selectedColor=null; state.selectedFuro=null; state.selectedSize=null;
    const search=$("searchInput"),cat=$("categoryFilter"),brand=$("brandFilter"),subcat=$("subcategoryFilter"),material=$("materialFilter"),color=$("colorFilter");
    if(search) search.value=""; if(cat) cat.value=""; if(brand) brand.value=""; if(subcat) subcat.value=""; if(material) material.value=""; if(color) color.value="";
    try{ renderSubcategories(); renderMaterials(); renderChips(); renderMechanicalSubcategories(); renderDigitalSubcategories();
      renderAccessorySubcategories(); renderHingeSubcategories(); renderHandlesSubcategories(); renderCategoryShowAll(); render(); renderCart(); }catch{}
    const currentHash=window.location.hash || "#top";
    if(currentHash !== "#top") pushNavigationState("#top",{home:true,reset:true});
    else replaceNavigationState("#top");
    markProgrammaticAreaNavigation(1300);
    const hero=document.querySelector(".hero");
    if(hero) requestAnimationFrame(()=>hero.scrollIntoView({behavior:"smooth",block:"start"}));
    else window.scrollTo({top:0,behavior:"smooth"});
    document.querySelector(".desktop-nav")?.classList.remove("mobile-open");
    updateSiteBackButton();
  }

  function updateSiteBackButton(){
    const btn=$("siteBackButton");
    if(!btn) return;
    const isAwayFromHero = window.location.hash !== "" && window.location.hash !== "#top";
    const isScrolledAway = window.scrollY > 120;
    btn.classList.toggle("is-visible", isAwayFromHero || isScrolledAway);
  }

  $("siteBackButton").onclick=()=>{
    if($("technicalFullscreen")?.classList.contains("open")){ closeTechnicalFullscreen(); return; }
    if(/^#produto=/.test(window.location.hash)){
      goBackFromProduct();
      return;
    }
    // Marca aberta: o próprio estado da marca contém o snapshot exato da seção
    // Marcas Parceiras. Isso garante DSS, ZEN, VIRTUS, IMAB, PADO, STAM, HAGA,
    // 3F, UNIÃO MUNDIAL e demais showcases retornem para a área de marcas.
    if(history.state?.brandNavigation && history.state?.navigationSnapshot){
      const parent={...history.state.navigationSnapshot,hash:"#marcas-parceiras"};
      document.querySelectorAll('.brand-showcase').forEach(el=>el.hidden=true);
      restoreNavigationState(parent,{scroll:false});
      const brands=$("marcas-parceiras");
      const headerH=(document.querySelector('.site-header')?.getBoundingClientRect().height||92);
      const y=brands?Math.max(0,brands.getBoundingClientRect().top+window.scrollY-headerH):Number(parent.scrollY)||0;
      parent.scrollY=y;
      history.replaceState({siteNavigation:true,navigationDepth:Math.max(0,(Number(history.state.navigationDepth)||1)-1),navigationSnapshot:parent},"","#marcas-parceiras");
      markProgrammaticAreaNavigation(1300);
      requestAnimationFrame(()=>window.scrollTo({top:y,behavior:"auto"}));
      syncActiveSiteAreaFromHash("#marcas-parceiras");
      updateSiteBackButton();
      return;
    }
    // Para páginas/estados internos, o botão do site usa o mesmo histórico do
    // navegador. O popstate restaura categoria, filtros e scroll.
    const depth=Number(history.state?.navigationDepth)||0;
    if(depth>0){
      history.back();
      return;
    }
    window.scrollTo({top:0,behavior:"smooth"});
    replaceNavigationState("#top");
    updateSiteBackButton();
  };

  // Logo e "Início" sempre levam diretamente ao Hero Banner.
  document.querySelectorAll("[data-home-link]").forEach(link=>{
    link.addEventListener("click",event=>{
      event.preventDefault();
      goToHome();
    });
  });

  document.addEventListener("click",event=>{
    const link=event.target.closest('a[href^="#"]');
    if(!link)return;
    const hash=link.getAttribute("href");
    if(!hash)return;
    if(hash==="#top" || link.hasAttribute("data-home-link"))return;
    if(hash==="#orcamento")registerQuoteClick();
    if(/^#produto=/.test(hash))return;

    // Impede a rolagem nativa + hashchange + rolagem programática de
    // acontecerem em sequência. Isso era a principal causa da rolagem excessiva.
    event.preventDefault();
    if(window.location.hash!==hash){
      pushNavigationState(hash,{hash});
    }
    scrollToHashTarget(hash);
    updateSiteBackButton();
  });

  // Eventos dinâmicos de catálogo: subcategorias, "Ver todos" e tipos de
  // produtos são renderizados novamente a cada mudança. Este listener garante
  // que todos esses estados entrem no histórico sem duplicar lógica nos cards.
  document.addEventListener("click",event=>{
    const target=event.target.closest(
      "[data-accessory-subcategory],[data-hinge-corner-subcategory],[data-hinge-material-subcategory]," +
      "[data-hinge-subcategory],[data-handles-type],[data-handles-size],[data-mechanical-lock-type]," +
      "[data-mechanical-door],[data-digital-install],[data-digital-door],[data-category-show-all]," +
      "[data-mechanical-show-all],[data-digital-back],[data-show-all],[data-subcategory]," +
      "[data-handles-back],[data-mechanical-back]"
    );
    if(!target || target.closest(".desktop-nav")) return;
    requestAnimationFrame(()=>pushNavigationState("#catalogo",{interaction:"catalog"}));
  });

  // Initial state
  ensureNavStack();
  if(!history.state?.siteNavigation) replaceNavigationState(window.location.hash||"#top");
  initSiteAreaHistory();
  applyI18n();
  renderCart();

  // Contadores sociais do site — persistem neste navegador.
  const ACCESS_COUNTER_KEY = "df-site-access-count";
  const QUOTE_COUNTER_KEY = "df-quote-click-count";
  const ACCESS_START = 20000;
  const QUOTE_START = 17000;

  function readCounter(key, fallback){
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value >= fallback ? value : fallback;
  }
  function formatCounter(value){ return Math.round(value).toLocaleString("pt-BR"); }
  function animateCounter(el, target, duration=950){
    if(!el)return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduce){ el.textContent=formatCounter(target); return; }
    const start=Number(el.dataset.current || el.textContent.replace(/\D/g,"")) || 0;
    const t0=performance.now();
    const tick=(now)=>{
      const p=Math.min((now-t0)/duration,1);
      const eased=1-Math.pow(1-p,3);
      el.textContent=formatCounter(start+(target-start)*eased);
      if(p<1)requestAnimationFrame(tick);
      else { el.textContent=formatCounter(target); el.dataset.current=target; }
    };
    requestAnimationFrame(tick);
  }
  function refreshTrustCounters(){
    const access=readCounter(ACCESS_COUNTER_KEY,ACCESS_START);
    const quotes=readCounter(QUOTE_COUNTER_KEY,QUOTE_START);
    const accessEl=$("siteAccessCounter");
    const quoteEl=$("quoteCounter");
    if(accessEl){ accessEl.textContent=formatCounter(access); accessEl.dataset.current=access; }
    if(quoteEl){ quoteEl.textContent=formatCounter(quotes); quoteEl.dataset.current=quotes; }
  }

  // Os números só contam quando a seção realmente entra na área visível.
  function initTrustStatsEntrance(){
    const section=document.querySelector(".trust-stats-section");
    if(!section)return;
    const accessEl=$("siteAccessCounter");
    const quoteEl=$("quoteCounter");
    const accessTarget=readCounter(ACCESS_COUNTER_KEY,ACCESS_START);
    const quoteTarget=readCounter(QUOTE_COUNTER_KEY,QUOTE_START);
    let played=false;
    const play=()=>{
      if(played)return;
      played=true;
      section.classList.add("is-visible");
      if(accessEl){ accessEl.dataset.current="0"; accessEl.textContent="0"; animateCounter(accessEl,accessTarget,850); }
      if(quoteEl){ quoteEl.dataset.current="0"; quoteEl.textContent="0"; animateCounter(quoteEl,quoteTarget,850); }
    };
    const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduce){
      section.classList.add("is-visible");
      return;
    }
    if("IntersectionObserver" in window){
      const observer=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting)){
          play();
          observer.disconnect();
        }
      },{threshold:.28});
      observer.observe(section);
    }else{
      const onScroll=()=>{
        const rect=section.getBoundingClientRect();
        if(rect.top<window.innerHeight*.72 && rect.bottom>0){
          play();
          window.removeEventListener("scroll",onScroll);
        }
      };
      window.addEventListener("scroll",onScroll,{passive:true});
      onScroll();
    }
  }
  function registerSiteAccess(){
    const current=readCounter(ACCESS_COUNTER_KEY,ACCESS_START);
    localStorage.setItem(ACCESS_COUNTER_KEY,String(current+1));
  }
  function registerQuoteClick(){
    const current=readCounter(QUOTE_COUNTER_KEY,QUOTE_START);
    const next=current+1;
    localStorage.setItem(QUOTE_COUNTER_KEY,String(next));
    const el=$("quoteCounter");
    if(el) animateCounter(el,next,700);
  }
  refreshTrustCounters();
  registerSiteAccess();
  initTrustStatsEntrance();

  window.addEventListener("hashchange", ()=>{
    syncActiveSiteAreaFromHash(history.state?.navigationSnapshot?.hash || window.location.hash);
    openProductByHash();
    if(!/^#produto=/.test(window.location.hash)){
      const snapshot=history.state?.navigationSnapshot;
      if(snapshot) restoreNavigationState(snapshot,{scroll:true});
      else scrollToHashTarget(window.location.hash);
    }
    updateSiteBackButton();
  });
  window.addEventListener("popstate", ()=>{
    const snapshot=history.state?.navigationSnapshot;
    syncActiveSiteAreaFromHash(snapshot?.hash || window.location.hash);
    if(/^#produto=/.test(window.location.hash)){
      openProductByHash();
    }else if(snapshot){
      restoreNavigationState(snapshot,{scroll:true});
    }else{
      openProductByHash();
      scrollToHashTarget(window.location.hash);
    }
    updateSiteBackButton();
  });
  window.addEventListener("load", ()=>{
    openProductByHash();
    scrollToHashTarget(window.location.hash);
    updateSiteBackButton();
  });

startHumanServiceCarousel();
})();


/* ORÇAMENTO — manual guiado e ações centralizadas */
(function(){
  const modal = () => document.getElementById("manual-orcamento");

  function openManual(){
    const m=modal(); if(!m) return;
    m.classList.add("is-open");
    document.body.classList.add("manual-orcamento-open");
  }
  function closeManual(){
    const m=modal(); if(!m) return;
    m.classList.remove("is-open");
    document.body.classList.remove("manual-orcamento-open");
  }
  function reviewCart(){
    closeManual();
    const selectors=["#cart","#carrinho",".cart-modal",".carrinho-modal",".cart-drawer","#orcamento","#budget"];
    const target=selectors.map(s=>document.querySelector(s)).find(Boolean);
    if(target){
      target.classList.add("is-open","open","active");
      target.scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }
    if(typeof window.openCart==="function"){ try{window.openCart();return;}catch(e){} }
    if(typeof window.abrirCarrinho==="function"){ try{window.abrirCarrinho();return;}catch(e){} }
    window.dispatchEvent(new CustomEvent("open-cart"));
  }
  function requestQuote(){
    closeManual();
    const button=document.getElementById("requestQuote");
    if(button){
      window.quoteRequestConfirmed=true;
      button.click();
      setTimeout(()=>{window.quoteRequestConfirmed=false},1500);
      return;
    }
    if(typeof window.solicitarOrcamento==="function"){ window.solicitarOrcamento(); return; }
    if(typeof window.requestQuote==="function"){ window.requestQuote(); return; }
    const selectors=["#btn-solicitar-orcamento",".btn-solicitar-orcamento","[data-action='request-quote']"];
    const b=selectors.map(s=>document.querySelector(s)).find(Boolean);
    if(b){ b.click(); return; }
    window.dispatchEvent(new CustomEvent("request-quote"));
  }

  function bind(){
    const m=modal(); if(!m) return;
    document.getElementById("manual-orcamento-close")?.addEventListener("click",closeManual);
    document.getElementById("manual-revisar-carrinho")?.addEventListener("click",reviewCart);
    document.getElementById("manual-solicitar-orcamento")?.addEventListener("click",requestQuote);
    m.addEventListener("click",e=>{if(e.target===m)closeManual();});
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",bind); else bind();

  // Expose a single entry point so existing quote/login flows can show the manual.
  window.abrirManualOrcamento = openManual;
  window.mostrarManualOrcamento = openManual;

  // When the existing app dispatches common quote events, show the guide.
  ["quote:ready","quote:login-success","orcamento:ready","orcamento:login-success"].forEach(ev=>{
    window.addEventListener(ev,openManual);
  });
})();


/* =========================================================
   PERFIL PERSISTENTE — foto + dados do cliente
   ========================================================= */
(function () {
  const PROFILE_KEY = "designer_fechaduras_profile_v1";

  function readProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveProfile(profile) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        company: profile.company || "",
        city: profile.city || "",
        state: profile.state || "",
        photo: profile.photo || "",
        updatedAt: new Date().toISOString()
      }));
    } catch (_) {
      // If browser storage is unavailable/full, the account still works
      // through the backend session.
    }
  }

  function restoreProfile() {
    const p = readProfile();
    if (!p) return;

    const mappings = {
      name: ["#profile-name","#nome","#name","[name='name']","[name='nome']"],
      email: ["#profile-email","#email","[name='email']"],
      phone: ["#profile-phone","#telefone","#phone","[name='phone']","[name='telefone']"],
      company: ["#profile-company","#empresa","[name='company']","[name='empresa']"],
      city: ["#profile-city","#cidade","[name='city']","[name='cidade']"],
      state: ["#profile-state","#estado","#uf","[name='state']","[name='estado']"]
    };

    Object.entries(mappings).forEach(([key, selectors]) => {
      if (!p[key]) return;
      const el = selectors.map(s => document.querySelector(s)).find(Boolean);
      if (el && !el.value) el.value = p[key];
      if (el && el.dataset) el.dataset.profileRestored = "1";
    });

    if (p.photo) {
      document.querySelectorAll(
        "#profile-photo,.profile-photo,.avatar,.user-avatar,[data-profile-photo]"
      ).forEach(el => {
        if (el.tagName === "IMG") el.src = p.photo;
        else el.style.backgroundImage = `url("${p.photo.replace(/"/g, '\\"')}")`;
      });
    }

    window.dispatchEvent(new CustomEvent("profile-restored", { detail: p }));
  }

  function collectAndSaveProfile() {
    const get = selectors => {
      const el = selectors.map(s => document.querySelector(s)).find(Boolean);
      return el ? (el.value || "").trim() : "";
    };

    const current = readProfile() || {};
    saveProfile({
      ...current,
      name: get(["#profile-name","#nome","#name","[name='name']","[name='nome']"]) || current.name,
      email: get(["#profile-email","#email","[name='email']"]) || current.email,
      phone: get(["#profile-phone","#telefone","#phone","[name='phone']","[name='telefone']"]) || current.phone,
      company: get(["#profile-company","#empresa","[name='company']","[name='empresa']"]) || current.company,
      city: get(["#profile-city","#cidade","[name='city']","[name='cidade']"]) || current.city,
      state: get(["#profile-state","#estado","#uf","[name='state']","[name='estado']"]) || current.state,
      photo: current.photo || ""
    });
  }

  function bindPhotoPersistence() {
    document.querySelectorAll(
      'input[type="file"][accept*="image"], input[type="file"][accept*="png"], input[type="file"][accept*="jpg"], input[type="file"][accept*="jpeg"]'
    ).forEach(input => {
      if (input.dataset.profilePhotoBound === "1") return;
      input.dataset.profilePhotoBound = "1";

      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file || !file.type.startsWith("image/")) return;

        // Limit browser-local avatar storage to avoid filling localStorage.
        if (file.size > 2 * 1024 * 1024) {
          alert("A foto deve ter no máximo 2 MB.");
          input.value = "";
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const p = readProfile() || {};
          saveProfile({ ...p, photo: reader.result });
          restoreProfile();
        };
        reader.readAsDataURL(file);
      });
    });
  }

  function bindProfileSaving() {
    document.querySelectorAll("form").forEach(form => {
      if (form.dataset.profileSaveBound === "1") return;
      const text = ((form.id || "") + " " + (form.className || "") + " " + (form.textContent || "")).toLowerCase();
      if (!/perfil|profile|cadastro|account|conta/.test(text)) return;

      form.dataset.profileSaveBound = "1";
      form.addEventListener("submit", () => setTimeout(collectAndSaveProfile, 50));
    });

    document.addEventListener("change", e => {
      if (e.target.matches("#profile-name,#nome,#name,#profile-email,#email,#profile-phone,#telefone,#phone,#profile-company,#empresa,#profile-city,#cidade,#profile-state,#estado,#uf,[name='name'],[name='nome'],[name='email'],[name='phone'],[name='telefone'],[name='company'],[name='empresa'],[name='city'],[name='cidade'],[name='state'],[name='estado']")) {
        collectAndSaveProfile();
      }
    });
  }

  // Public helpers for the existing account UI.
  window.DesignerProfile = {
    get: readProfile,
    save: saveProfile,
    restore: restoreProfile,
    clear: function () {
      localStorage.removeItem(PROFILE_KEY);
    }
  };

  function init() {
    restoreProfile();
    bindPhotoPersistence();
    bindProfileSaving();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Dynamic account/profile screens are also covered.
  new MutationObserver(() => {
    restoreProfile();
    bindPhotoPersistence();
    bindProfileSaving();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();


function getRequiredProductSize(product, root=document){
  if(!product?.requiresSize) return null;
  const el=root.querySelector?.(".product-size-select") || document.querySelector(".product-size-select");
  const value=el?.value?.trim();
  if(!value){ alert("Escolha o tamanho antes de fazer o orçamento."); el?.focus(); return null; }
  return value;
}


/* FECHO_UNHA_PLACEMENT_FIX */
(function(){
  const id="fecho-unha-embutir-uniao-mundial";
  window.FECHO_UNHA_PLACEMENT={id:id,category:"accessories",subcategory:"Fechos",global:true};
})();

/* PROTEÇÃO DE IMAGENS — bloqueia cópia/arraste/menus de salvamento em TODAS as imagens do site */
(function initGlobalImageProtection(){
  const IMAGE_SELECTOR = 'img, picture, source, image';

  const pathHasImage = (event) => {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (path.some(node => node instanceof HTMLImageElement)) return true;
    if (path.some(node => node instanceof Element && node.matches?.(IMAGE_SELECTOR))) return true;

    const target = event.target;
    if (!(target instanceof Element)) return false;
    if (target.closest(IMAGE_SELECTOR)) return true;

    // Muitos cards usam pointer-events:none na imagem. Nesses casos o evento
    // chega ao card/container; detectamos então se o elemento clicado contém
    // uma imagem visível em qualquer nível descendente.
    let node = target;
    while (node && node instanceof Element) {
      if (node.matches?.('img, picture')) return true;
      if (node.querySelector?.('img, picture')) return true;
      node = node.parentElement;
    }
    return false;
  };

  const markImages = (root=document) => {
    const nodes = [];
    if (root instanceof HTMLImageElement) nodes.push(root);
    if (root?.querySelectorAll) nodes.push(...root.querySelectorAll('img'));
    nodes.forEach(img => {
      img.setAttribute('draggable', 'false');
      img.setAttribute('aria-disabled', 'true');
      img.style.setProperty('user-select', 'none', 'important');
      img.style.setProperty('-webkit-user-select', 'none', 'important');
      img.style.setProperty('-webkit-user-drag', 'none', 'important');
      img.style.setProperty('user-drag', 'none', 'important');
      img.style.setProperty('-webkit-touch-callout', 'none', 'important');
      img.oncontextmenu = () => false;
      img.ondragstart = () => false;
    });
  };

  // Bloqueia o menu de contexto quando a origem é uma imagem.
  document.addEventListener('contextmenu', event => {
    if (pathHasImage(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);

  // Bloqueia arraste de qualquer imagem, inclusive imagens inseridas dinamicamente.
  document.addEventListener('dragstart', event => {
    if (pathHasImage(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);

  document.addEventListener('dragover', event => {
    if (pathHasImage(event)) event.preventDefault();
  }, true);

  // Bloqueia Ctrl/Cmd+C quando a seleção contém imagem.
  document.addEventListener('copy', event => {
    const selection = window.getSelection?.();
    const containsImage = selection && !selection.isCollapsed && /<(img|picture|source)\b/i.test(selection.toString()) === false
      ? (() => {
          try {
            const range = selection.getRangeAt(0);
            const fragment = range.cloneContents();
            return !!fragment.querySelector?.(IMAGE_SELECTOR);
          } catch (_) { return false; }
        })()
      : false;

    if (containsImage || pathHasImage(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // Atalhos comuns usados para copiar/salvar imagens.
  document.addEventListener('keydown', event => {
    const key = String(event.key || '').toLowerCase();
    const meta = event.ctrlKey || event.metaKey;
    if (!meta) return;

    const selection = window.getSelection?.();
    let selectionHasImage = false;
    if (selection && !selection.isCollapsed && selection.rangeCount) {
      try {
        selectionHasImage = !!selection.getRangeAt(0).cloneContents().querySelector?.(IMAGE_SELECTOR);
      } catch (_) {}
    }

    const overImage = pathHasImage(event);
    if ((key === 'c' && (selectionHasImage || overImage)) || key === 's') {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // Impede a ação de abrir/arrastar a imagem por clique auxiliar.
  document.addEventListener('auxclick', event => {
    if (pathHasImage(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  markImages();

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) markImages(node);
      }
    }
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
  });
})();


/* === LOGOS DAS MARCAS NOS HEROES ===
 * Reaproveita a mesma logo exibida no card de cada marca.
 * Nenhuma imagem é criada ou modificada: apenas reutilizamos o arquivo existente.
 */
(() => {
  const installBrandHeroLogos = () => {
    document.querySelectorAll('.brand-showcase').forEach(showcase => {
      if (showcase.querySelector(':scope > .brand-showcase-hero > .brand-showcase-corner-logo')) return;

      const modifier = [...showcase.classList].find(c => c.startsWith('brand-showcase--'));
      if (!modifier) return;
      const brandKey = modifier.replace('brand-showcase--', '');
      const card = document.querySelector(`.brand-card[data-brand-partner="${CSS.escape(brandKey)}"]`);
      const hero = showcase.querySelector(':scope > .brand-showcase-hero');
      if (!card || !hero) return;

      const logo = card.querySelector('img');
      const wordmark = card.querySelector('.brand-card-3f-label');
      if (!logo && !wordmark) return;

      const corner = document.createElement('div');
      corner.className = 'brand-showcase-corner-logo';
      corner.setAttribute('aria-hidden', 'true');

      if (logo) {
        const img = document.createElement('img');
        img.src = logo.currentSrc || logo.getAttribute('src') || '';
        img.alt = '';
        img.decoding = 'async';
        img.draggable = false;
        corner.appendChild(img);
      } else if (wordmark) {
        const span = document.createElement('span');
        span.className = 'brand-showcase-corner-wordmark';
        span.textContent = wordmark.textContent.trim();
        corner.appendChild(span);
      }

      hero.appendChild(corner);
      showcase.classList.add('brand-showcase--has-corner-logo');
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installBrandHeroLogos, { once:true });
  } else {
    installBrandHeroLogos();
  }
})();
