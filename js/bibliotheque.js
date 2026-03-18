/**
 * bibliotheque.js
 * Module Bibliothèque de sections — Stock Métallerie LBF
 * Gère l'affichage, les filtres, les modales et le CRUD des sections
 */

'use strict';

/* ══════════════════════════════════════════════
   ÉTAT GLOBAL DU MODULE
══════════════════════════════════════════════ */

const Biblio = {
  data: { standard: [], custom: [] },
  profil: 'consultation',
  filtres: { famille: '', recherche: '' },
  sectionEnCours: null
};

/* ══════════════════════════════════════════════
   MAPPING DESCRIPTIONS FAMILLES (global)
══════════════════════════════════════════════ */
const DESC_FAMILLES = {
  'Profilés I': 'Profilé en I à ailes parallèles',
  'Profilés H': 'Profilé en H à larges ailes',
  'Profilés U': 'Profilé en U',
  'Cornière':   'Cornière à ailes égales ou inégales',
  'Plat':       'Plat laminé à chaud',
};

/* ══════════════════════════════════════════════
   CHARGEMENT DES DONNÉES
══════════════════════════════════════════════ */

async function biblioInit(profil) {
  Biblio.profil = profil || 'consultation';
  try {
    const rep = await fetch('../data/sections.json');
    if (!rep.ok) throw new Error('Impossible de charger sections.json');
    Biblio.data = await rep.json();
  } catch (e) {
    console.warn('sections.json non accessible — données de démo utilisées');
    Biblio.data = SECTIONS_DEMO;
  }
  biblioRendreBoutonAjout();
  biblioRendreGrille();
  biblioBindFiltres();
}

/* ══════════════════════════════════════════════
   RENDU DE LA GRILLE
══════════════════════════════════════════════ */

function biblioRendreGrille() {
  const conteneur = document.getElementById('biblio-grille');
  if (!conteneur) return;

  const rech       = Biblio.filtres.recherche;
  const famFiltree = Biblio.filtres.famille;

  const FAMILLES = [
    {
      id:     'IPE',
      titre:  'IPE — Profilés en I',
      norme:  'EN 10034 / EN 10024',
      famJson:'Profilés I',
      series: [
        { serie:'IPE',    photo:'../assets/profils/IPE.png'   },
        { serie:'IPE A',  photo:'../assets/profils/IPEA.png'  },
        { serie:'IPE AA', photo:'../assets/profils/IPEAA.png' },
        { serie:'IPE O',  photo:'../assets/profils/IPEO.png'  },
        { serie:'IPN',    photo:'../assets/profils/IPN.png'   }
      ]
    },
    {
      id:     'HE',
      titre:  'HE — Profilés en H',
      norme:  'EN 10034',
      famJson:'Profilés H',
      series: [
        { serie:'HEA',   photo:'../assets/profils/HEA.png'  },
        { serie:'HEA A', photo:'../assets/profils/HEAA.png' },
        { serie:'HEB',   photo:'../assets/profils/HEB.png'  },
        { serie:'HEM',   photo:'../assets/profils/HEM.png'  }
      ]
    },
    {
      id:     'U',
      titre:  'U — Profilés en U',
      norme:  'EN 10279 / EN 10162',
      famJson:'Profilés U',
      series: [
        { serie:'UPN', photo:'../assets/profils/UPN.png' },
        { serie:'UPE', photo:'../assets/profils/UPE.png' }
      ]
    },
    {
      id:     'Cornière',
      titre:  'Cornière',
      norme:  'EN 10056-1 / -2',
      famJson:'Cornière',
      series: [
        { serie:'L égale',   photo:'../assets/profils/Le.png' },
        { serie:'L inégale', photo:'../assets/profils/Li.png' }
      ]
    }
  ];

  conteneur.innerHTML = '';
  let nbFamilles = 0;
  let nbTotal    = 0;

  FAMILLES.forEach(fam => {
    if (famFiltree && fam.id !== famFiltree) return;

    const famStd = Biblio.data.standard.find(f => f.famille === fam.famJson);
    if (!famStd) return;

    const seriesAvecCount = fam.series.map(sr => {
      const secs = famStd.sections.filter(s => {
        if (s.serie !== sr.serie) return false;
        if (rech) return s.desig.toLowerCase().includes(rech);
        return true;
      });
      return { ...sr, nbDesig: secs.length };
    }).filter(sr => sr.nbDesig > 0 || !rech);

    if (seriesAvecCount.length === 0) return;

    nbFamilles++;
    nbTotal += seriesAvecCount.reduce((s, sr) => s + sr.nbDesig, 0);

    const sep = document.createElement('div');
    sep.className = 'biblio-sep-famille';
    sep.innerHTML = `
      <div class="bsf-titre">${fam.titre}</div>
      <div class="bsf-norme">${fam.norme}</div>`;
    conteneur.appendChild(sep);

    const grille = document.createElement('div');
    grille.className = 'biblio-grille-series';
    seriesAvecCount.forEach(sr => {
      grille.appendChild(biblioCreerCarteSerie(sr, fam));
    });
    conteneur.appendChild(grille);
  });

  if (nbFamilles === 0) {
    conteneur.innerHTML = `
      <div class="biblio-vide" style="grid-column:1/-1;padding:40px;text-align:center;">
        <span style="font-size:32px">🔍</span>
        <p style="margin-top:10px;color:#aaa">Aucune famille ne correspond aux filtres</p>
      </div>`;
  }

  const cpt = document.getElementById('biblio-compteur');
  if (cpt) cpt.textContent = `${nbFamilles} famille(s) — ${nbTotal} désignation(s)`;
}

function biblioCreerCarteSerie(sr, fam) {
  const carteId = `cs-${(sr.serie).replace(/[^a-zA-Z0-9]/g,'_')}`;

  const carte = document.createElement('div');
  carte.className = 'biblio-carte-serie';
  carte.id = carteId;
  carte.onclick = () => biblioOuvrirModaleSerie(sr.serie, fam.id);

  const visuelHtml = `
    <div class="cs-visuel">
      <img class="cs-photo" id="${carteId}-img"
           src="${sr.photo}"
           alt="${sr.serie}"
           onerror="carteSeriePhotoErreur('${carteId}','${fam.id}')">
      <div class="cs-svg-fallback" id="${carteId}-svg" style="display:none">
        ${biblioSchemasFamille(fam.id).split('</div>')[0] + '</div>'}
      </div>
    </div>`;

  carte.innerHTML = `
    <div class="cs-header">
      <span class="cs-titre">${sr.serie}</span>
      <span class="cs-count">${sr.nbDesig} réf.</span>
    </div>
    ${visuelHtml}
    <div class="cs-footer">
      <span class="cs-voir">Voir les désignations →</span>
    </div>`;

  return carte;
}

function carteSeriePhotoErreur(carteId, famId) {
  const img = document.getElementById(`${carteId}-img`);
  const svg = document.getElementById(`${carteId}-svg`);
  if (img) img.style.display = 'none';
  if (svg) svg.style.display = 'flex';
}

/* ══════════════════════════════════════════════
   MODALE FAMILLE — TABLEAU + SVG
══════════════════════════════════════════════ */

const MfEtat = {
  famId:    '',
  famJson:  '',
  sections: [],
  groupes:  []
};

const MF_PHOTOS = {
  'IPE':       '../assets/profils/IPE.png',
  'IPE A':     '../assets/profils/IPEA.png',
  'IPE AA':    '../assets/profils/IPEAA.png',
  'IPE O':     '../assets/profils/IPEO.png',
  'IPN':       '../assets/profils/IPN.png',
  'HEA':       '../assets/profils/HEA.png',
  'HEA A':     '../assets/profils/HEAA.png',
  'HEB':       '../assets/profils/HEB.png',
  'HEM':       '../assets/profils/HEM.png',
  'UPN':       '../assets/profils/UPN.png',
  'UPE':       '../assets/profils/UPE.png',
  'L égale':   '../assets/profils/Le.png',
  'L inégale': '../assets/profils/Li.png'
};

/**
 * Ouvre la modale directement sur une série précise
 */
function biblioOuvrirModaleSerie(serie, famId) {
  const m = document.getElementById('m-famille');
  if (!m) return;

  const MAP_FAM = {
    'IPE': 'Profilés I', 'HE': 'Profilés H',
    'U':   'Profilés U', 'Cornière': 'Cornière', 'Plat': 'Plat'
  };
  const famJson = MAP_FAM[famId] || famId;
  const famStd  = Biblio.data.standard.find(f => f.famille === famJson);
  if (!famStd) return;

  const sections = famStd.sections.filter(s => s.serie === serie);

  MfEtat.famId    = famId;
  MfEtat.famJson  = famJson;
  MfEtat.sections = sections;
  MfEtat.groupes  = [{ serie, secs: sections }];

  // Titre modale = description famille + norme (déclaré avant utilisation)
  const _norme   = famStd.norme || '';
  const _descFin = DESC_FAMILLES[famJson] || famJson;
  m.querySelector('#mf-titre').textContent = `${_descFin} — ${_norme}`;
  m.querySelector('#mf-titre').style.color = 'var(--noir)';
  m.querySelector('#mf-norme').innerHTML   = '';

  // Réinitialiser label désignation
  m.querySelector('#mf-desig-label').textContent = '← Sélectionnez une ligne';
  m.querySelector('#mf-desig-label').style.color = 'var(--noir)';
  m.querySelector('#mf-dims').innerHTML          = '';

  // Image initiale
  const imgSrcInit = MF_PHOTOS[serie] || null;
  const imgZone    = m.querySelector('#mf-img-zone');
  if (imgZone) {
    imgZone.innerHTML = imgSrcInit
      ? mfImageHtml(imgSrcInit, serie)
      : `<span style="color:#ccc;font-size:12px;">—</span>`;
  }

  mfRendreTableauSimple(m, sections, famJson, serie);
  m.classList.add('open');
}

/**
 * Ouvre la modale famille avec accordéon (entrée depuis famille complète)
 */
function biblioOuvrirModaleFamille(famId, serieActive) {
  const m = document.getElementById('m-famille');
  if (!m) return;

  const MAP_FAM = {
    'IPE': 'Profilés I', 'HE': 'Profilés H',
    'U':   'Profilés U', 'Cornière': 'Cornière', 'Plat': 'Plat'
  };
  const famJson = MAP_FAM[famId] || famId;
  const famStd  = Biblio.data.standard.find(f => f.famille === famJson);
  const toutes  = famStd ? famStd.sections : Biblio.data.custom.filter(s => s.famille === famId);

  const groupesMap = {};
  toutes.forEach(s => {
    const serie = s.serie || famJson;
    if (!groupesMap[serie]) groupesMap[serie] = [];
    groupesMap[serie].push(s);
  });
  const groupes = Object.entries(groupesMap).map(([serie, secs]) => ({ serie, secs }));

  MfEtat.famId    = famId;
  MfEtat.famJson  = famJson;
  MfEtat.sections = toutes;
  MfEtat.groupes  = groupes;

  const _norme   = famStd ? (famStd.norme || '') : '';
  const _descFin = DESC_FAMILLES[famJson] || famJson;
  m.querySelector('#mf-titre').textContent = `${_descFin} — ${_norme}`;
  m.querySelector('#mf-titre').style.color = 'var(--noir)';
  m.querySelector('#mf-norme').innerHTML   = '';
  m.querySelector('#mf-dims').innerHTML          = '';
  m.querySelector('#mf-desig-label').textContent = '← Sélectionnez une ligne';
  m.querySelector('#mf-desig-label').style.color = 'var(--noir)';
  m.querySelector('#mf-img-zone').innerHTML      = '<span style="color:#ccc;font-size:12px;">—</span>';

  mfRendreAccordeon(m, groupes, famJson);
  m.classList.add('open');

  if (serieActive) {
    setTimeout(() => mfMettreEnAvantSerie(serieActive), 80);
  }
}

function mfImageHtml(src, serie) {
  return `<img src="${src}" alt="${serie}" data-serie="${serie}" data-zoom="0"
    style="max-width:100%; max-height:220px; object-fit:contain; display:block;
           margin:0 auto; cursor:zoom-in; transition:max-height .2s;"
    onclick="mfZoomImage(this)"
    onerror="this.parentNode.innerHTML='<span style=color:#ccc;font-size:11px>Image non disponible</span>'">`;
}

function mfZoomImage(img) {
  const zoom = img.dataset.zoom === '1';
  if (zoom) {
    img.style.maxHeight  = '220px';
    img.style.cursor     = 'zoom-in';
    img.dataset.zoom     = '0';
    img.style.position   = '';
    img.style.zIndex     = '';
    img.style.background = '';
    img.style.padding    = '';
    img.style.boxShadow  = '';
    const overlay = document.getElementById('mf-zoom-overlay');
    if (overlay) overlay.remove();
  } else {
    img.dataset.zoom = '1';
    img.style.cursor = 'zoom-out';

    const overlay = document.createElement('div');
    overlay.id = 'mf-zoom-overlay';
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.75);
      display:flex; align-items:center; justify-content:center;
      z-index:9999; cursor:zoom-out;`;
    overlay.onclick = () => mfZoomImage(img);

    const imgGrande = document.createElement('img');
    imgGrande.src   = img.src;
    imgGrande.alt   = img.alt;
    imgGrande.style.cssText = `
      max-width:90vw; max-height:85vh;
      object-fit:contain; display:block;
      border-radius:4px; box-shadow:0 8px 40px rgba(0,0,0,0.6);`;
    overlay.appendChild(imgGrande);

    const btnFermer = document.createElement('button');
    btnFermer.textContent = '✕';
    btnFermer.style.cssText = `
      position:absolute; top:16px; right:20px;
      background:rgba(255,255,255,0.15); border:none; color:white;
      font-size:22px; cursor:pointer; border-radius:50%;
      width:36px; height:36px; display:flex; align-items:center; justify-content:center;`;
    btnFermer.onclick = (e) => { e.stopPropagation(); mfZoomImage(img); };
    overlay.appendChild(btnFermer);

    document.body.appendChild(overlay);
  }
}

function mfRendreTableauSimple(m, sections, famJson, serie) {
  const accordeon = m.querySelector('#mf-accordeon');
  if (!accordeon) return;

  const colonnes = _colonnesFamille(famJson);

  let thHtml = '<thead><tr>';
  thHtml += '<th style="text-align:left;padding:7px 10px;">Désig.</th>';
  colonnes.forEach(c => { thHtml += `<th style="padding:7px 6px;">${c.label}</th>`; });
  thHtml += '</tr></thead>';

  let tbHtml = '<tbody>';
  sections.forEach((s) => {
    const idxGlobal = MfEtat.sections.indexOf(s);
    tbHtml += `<tr class="mf-ligne" onclick="biblioSelectionnerDesig(${idxGlobal})">`;
    tbHtml += `<td style="padding:6px 10px;font-weight:bold;">${s.desig}</td>`;
    colonnes.forEach(c => {
      tbHtml += `<td style="padding:6px;text-align:right;color:#555;">${s[c.key] !== undefined ? s[c.key] : '—'}</td>`;
    });
    tbHtml += '</tr>';
  });
  tbHtml += '</tbody>';

  const HAUTEUR_LIGNE = 37;
  const HAUTEUR_THEAD = 33;
  const hauteurMax    = HAUTEUR_THEAD + (5 * HAUTEUR_LIGNE);

  accordeon.innerHTML = `
    <div style="overflow-y:auto; max-height:${hauteurMax}px; border:1px solid var(--gris-cl); border-radius:3px;">
      <table class="mf-groupe-table" style="margin:0;">${thHtml}${tbHtml}</table>
    </div>`;
}

function mfRendreAccordeon(m, groupes, famJson) {
  const conteneur = m.querySelector('#mf-accordeon');
  if (!conteneur) return;
  conteneur.innerHTML = '';

  const colonnes = _colonnesFamille(famJson);

  groupes.forEach((grp, gi) => {
    const groupeId = `mfg-${gi}`;

    const header = document.createElement('div');
    header.className = 'mf-groupe-header';
    header.innerHTML = `
      <span class="mf-groupe-titre">
        ${grp.serie}
        <span class="mf-groupe-count">${grp.secs.length} désignation(s)</span>
      </span>
      <span class="mf-groupe-fleche ouvert" id="${groupeId}-fleche">▶</span>`;
    header.onclick = () => mfToggleGroupe(groupeId);
    conteneur.appendChild(header);

    const corps = document.createElement('div');
    corps.className = 'mf-groupe-corps';
    corps.id = groupeId;

    let thHtml = '<thead><tr>';
    thHtml += '<th style="text-align:left;padding:7px 10px;">Désig.</th>';
    colonnes.forEach(c => { thHtml += `<th style="padding:7px 6px;">${c.label}</th>`; });
    thHtml += '</tr></thead>';

    let tbHtml = '<tbody>';
    grp.secs.forEach((s) => {
      const idxGlobal = MfEtat.sections.indexOf(s);
      tbHtml += `<tr class="mf-ligne" onclick="biblioSelectionnerDesig(${idxGlobal})">`;
      tbHtml += `<td style="padding:6px 10px;font-weight:bold;">${s.desig}</td>`;
      colonnes.forEach(c => {
        tbHtml += `<td style="padding:6px;text-align:right;color:#555;">${s[c.key] !== undefined ? s[c.key] : '—'}</td>`;
      });
      tbHtml += '</tr>';
    });
    tbHtml += '</tbody>';

    corps.innerHTML = `<table class="mf-groupe-table">${thHtml}${tbHtml}</table>`;
    corps.style.maxHeight = corps.scrollHeight + 'px';
    setTimeout(() => { corps.style.maxHeight = corps.scrollHeight + 2000 + 'px'; }, 10);
    conteneur.appendChild(corps);
  });
}

function mfToggleGroupe(groupeId) {
  const corps  = document.getElementById(groupeId);
  const fleche = document.getElementById(`${groupeId}-fleche`);
  if (!corps) return;

  const ferme = corps.classList.contains('ferme');
  if (ferme) {
    corps.style.maxHeight = corps.scrollHeight + 2000 + 'px';
    corps.classList.remove('ferme');
    if (fleche) fleche.classList.add('ouvert');
  } else {
    corps.style.maxHeight = '0';
    corps.classList.add('ferme');
    if (fleche) fleche.classList.remove('ouvert');
  }
}

function mfMettreEnAvantSerie(serie) {
  const accordeon = document.getElementById('mf-accordeon');
  if (!accordeon) return;
  const headers = accordeon.querySelectorAll('.mf-groupe-header');
  headers.forEach(h => {
    const titre = h.querySelector('.mf-groupe-titre');
    if (titre && titre.textContent.trim().startsWith(serie)) {
      const groupeId = h.nextElementSibling && h.nextElementSibling.id;
      if (groupeId) {
        const corps = document.getElementById(groupeId);
        if (corps && corps.classList.contains('ferme')) mfToggleGroupe(groupeId);
      }
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      h.style.background = 'rgba(210,35,42,0.12)';
      setTimeout(() => { h.style.background = ''; }, 1200);
    }
  });
}

/**
 * Sélectionne une désignation → image PNG + dimensions
 */
function biblioSelectionnerDesig(idxGlobal) {
  const m = document.getElementById('m-famille');
  if (!m) return;

  const s = MfEtat.sections[idxGlobal];
  if (!s) return;

  // Mettre en évidence la ligne
  m.querySelectorAll('.mf-ligne').forEach(tr => tr.classList.remove('mf-active'));
  m.querySelectorAll('.mf-ligne').forEach(tr => {
    if (tr.getAttribute('onclick') === `biblioSelectionnerDesig(${idxGlobal})`) {
      tr.classList.add('mf-active');
      const groupe = tr.closest('.mf-groupe-corps');
      if (groupe && groupe.classList.contains('ferme')) mfToggleGroupe(groupe.id);
    }
  });

  // Titre section en rouge au-dessus des dimensions
  const _serie      = s.serie || MfEtat.famJson;
  const _titreDesig = s.desig.startsWith(_serie) ? s.desig : `${_serie} ${s.desig}`;
  m.querySelector('#mf-desig-label').textContent = _titreDesig;
  m.querySelector('#mf-desig-label').style.color = 'var(--rouge)';

  // Image
  const serie   = s.serie || MfEtat.famId;
  const imgSrc  = MF_PHOTOS[serie] || null;
  const imgZone = m.querySelector('#mf-img-zone');
  const imgCur  = imgZone ? imgZone.querySelector('img') : null;
  if (imgZone && (!imgCur || imgCur.dataset.serie !== serie)) {
    imgZone.innerHTML = imgSrc
      ? mfImageHtml(imgSrc, serie)
      : `<div style="padding:10px;">${biblioSvgCote({ famille: MfEtat.famJson, ...s }, 180, 160)}</div>`;
  }

  // Dimensions
  const dims = _dimsSection(s, MfEtat.famJson);
  m.querySelector('#mf-dims').innerHTML = dims.map(d =>
    `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee;font-size:12px;">
      <span style="color:#666;">${d[0]}</span>
      <span style="font-weight:bold;">${d[1]}</span>
    </div>`
  ).join('');
}

/* ══════════════════════════════════════════════
   FILTRES
══════════════════════════════════════════════ */

function biblioBindFiltres() {
  const selFamille     = document.getElementById('biblio-filtre-famille');
  const inputRecherche = document.getElementById('biblio-recherche');

  if (selFamille) {
    selFamille.addEventListener('change', () => {
      Biblio.filtres.famille = selFamille.value;
      biblioRendreGrille();
    });
  }
  if (inputRecherche) {
    inputRecherche.addEventListener('input', () => {
      Biblio.filtres.recherche = inputRecherche.value.toLowerCase().trim();
      biblioRendreGrille();
    });
  }
}

function biblioGetSectionsFiltrees() {
  const toutes = [
    ...Biblio.data.standard.flatMap(fam =>
      fam.sections.map(s => ({
        ...s,
        famille: fam.famille,
        type: fam.type,
        norme: fam.norme,
        source: 'standard',
        statut: 'valide'
      }))
    ),
    ...Biblio.data.custom.map(s => ({ ...s, source: 'custom' }))
  ];

  return toutes.filter(s => {
    if (Biblio.filtres.famille && s.famille !== Biblio.filtres.famille) return false;
    if (Biblio.filtres.recherche) {
      const txt = `${s.famille} ${s.desig}`.toLowerCase();
      if (!txt.includes(Biblio.filtres.recherche)) return false;
    }
    if (s.statut === 'attente' && Biblio.profil === 'consultation') return false;
    return true;
  });
}

/* ══════════════════════════════════════════════
   MODALE FICHE DÉTAIL
══════════════════════════════════════════════ */

function biblioOuvrirFiche(idSec) {
  const section = biblioTrouverSection(idSec);
  if (!section) return;

  const modale = document.getElementById('m-detail-biblio');
  if (!modale) return;

  modale.querySelector('.modale-titre').textContent =
    `Fiche section — ${section.famille} ${section.desig}`;

  const titreSchema = modale.querySelector('.schema-dims h4');
  if (titreSchema) titreSchema.textContent = 'Dimensions normalisées';

  const badgeZone = modale.querySelector('.detail-badge-zone');
  if (badgeZone) {
    badgeZone.innerHTML = section.source === 'custom'
      ? `<span class="dispo-badge d-custom">Section personnalisée</span>`
      : `<span class="dispo-badge d-std">Standard ${section.norme || 'EN'}</span>`;
    badgeZone.innerHTML += ` <span style="font-size:12px;color:#888">${biblioDescriptionType(section.type)}</span>`;
  }

  const svgZone = modale.querySelector('.detail-svg-zone');
  if (svgZone) {
    svgZone.innerHTML = `
      <div class="schema-titre">Schéma coté ${section.famille} ${section.desig}</div>
      ${biblioSvgCote(section, 180, 180)}`;
  }

  const dimsZone = modale.querySelector('.detail-dims-zone');
  if (dimsZone) dimsZone.innerHTML = biblioDimsTableau(section);

  modale.classList.add('open');
}

function biblioDimsTableau(s) {
  const lignes = [];
  if (s.h   !== undefined) lignes.push(['h — Hauteur',         `${s.h} mm`]);
  if (s.b   !== undefined) lignes.push(['b — Largeur aile',    `${s.b} mm`]);
  if (s.tw  !== undefined) lignes.push(['tw — Épaisseur âme',  `${s.tw} mm`]);
  if (s.tf  !== undefined) lignes.push(['tf — Épaisseur aile', `${s.tf} mm`]);
  if (s.r   !== undefined) lignes.push(['r — Congé',           `${s.r} mm`]);
  if (s.a   !== undefined) lignes.push(['a — Côté',            `${s.a} mm`]);
  if (s.t   !== undefined) lignes.push(['t — Épaisseur',       `${s.t} mm`]);
  if (s.b_plat !== undefined) lignes.push(['b — Largeur',      `${s.b_plat} mm`]);
  if (s.e   !== undefined) lignes.push(['e — Épaisseur',       `${s.e} mm`]);
  if (s.pml !== undefined) lignes.push(['Poids/ml',            `${s.pml} kg/m`]);
  if (s.A   !== undefined) lignes.push(['Section',             `${s.A} cm²`]);
  if (s.norme) lignes.push(['Norme', s.norme]);

  return lignes.map(([label, val]) => `
    <div class="dim-row">
      <span class="dim-label">${label}</span>
      <span class="dim-val">${val}</span>
    </div>`).join('');
}

function biblioResumeDesig(s) {
  const items = [];
  if (s.h)   items.push(`<span class="dim-chip">h=${s.h}</span>`);
  if (s.b)   items.push(`<span class="dim-chip">b=${s.b}</span>`);
  if (s.a)   items.push(`<span class="dim-chip">a=${s.a}</span>`);
  if (s.pml) items.push(`<span class="dim-chip poids">${s.pml} kg/m</span>`);
  return `<div class="carte-dims-chips">${items.join('')}</div>`;
}

/* ══════════════════════════════════════════════
   COLONNES & DIMENSIONS
══════════════════════════════════════════════ */

function _colonnesFamille(famille) {
  switch (famille) {
    case 'Profilés I': case 'Profilés H':
      return [
        { key:'h',   label:'h mm'  },
        { key:'b',   label:'b mm'  },
        { key:'tw',  label:'tw mm' },
        { key:'tf',  label:'tf mm' },
        { key:'r',   label:'r mm'  },
        { key:'pml', label:'kg/m'  },
      ];
    case 'Profilés U':
      return [
        { key:'h',   label:'h mm'  },
        { key:'b',   label:'b mm'  },
        { key:'tw',  label:'tw mm' },
        { key:'tf',  label:'tf mm' },
        { key:'pml', label:'kg/m'  },
      ];
    case 'Cornière':
      return [
        { key:'h',   label:'a mm'  },
        { key:'b',   label:'b mm'  },
        { key:'tw',  label:'e mm'  },
        { key:'pml', label:'kg/m'  },
      ];
    case 'Plat':
      return [
        { key:'b',   label:'b mm'  },
        { key:'tw',  label:'e mm'  },
        { key:'pml', label:'kg/m'  },
      ];
    default:
      return [
        { key:'h',   label:'h mm'  },
        { key:'b',   label:'b mm'  },
        { key:'pml', label:'kg/m'  },
      ];
  }
}

function _dimsSection(s, famille) {
  switch (famille) {
    case 'Profilés I': case 'Profilés H':
      return [
        ['h — Hauteur',     (s.h  ||'—')+' mm'],
        ['b — Largeur aile',(s.b  ||'—')+' mm'],
        ['tw — Ép. âme',    (s.tw ||'—')+' mm'],
        ['tf — Ép. aile',   (s.tf ||'—')+' mm'],
        ['r — Congé',       (s.r  ||'—')+' mm'],
        ['Poids/ml',        (s.pml||'—')+' kg/m'],
      ];
    case 'Profilés U':
      return [
        ['h — Hauteur',     (s.h  ||'—')+' mm'],
        ['b — Largeur aile',(s.b  ||'—')+' mm'],
        ['tw — Ép. âme',    (s.tw ||'—')+' mm'],
        ['tf — Ép. aile',   (s.tf ||'—')+' mm'],
        ['Poids/ml',        (s.pml||'—')+' kg/m'],
      ];
    case 'Cornière':
      return [
        ['a — Grand côté',  (s.h  ||'—')+' mm'],
        ['b — Petit côté',  (s.b  ||'—')+' mm'],
        ['e — Épaisseur',   (s.tw ||'—')+' mm'],
        ['Poids/ml',        (s.pml||'—')+' kg/m'],
      ];
    case 'Plat':
      return [
        ['b — Largeur',     (s.b  ||'—')+' mm'],
        ['e — Épaisseur',   (s.tw ||'—')+' mm'],
        ['Poids/ml',        (s.pml||'—')+' kg/m'],
      ];
    default:
      return [
        ['h',               (s.h  ||'—')+' mm'],
        ['b',               (s.b  ||'—')+' mm'],
        ['kg/m',            (s.pml||'—')+' kg/m'],
      ];
  }
}

/* ══════════════════════════════════════════════
   CRÉATION / ÉDITION (Gestion + Admin)
══════════════════════════════════════════════ */

function biblioRendreBoutonAjout() {
  const btnZone = document.getElementById('biblio-btn-ajout');
  if (!btnZone) return;
  if (Biblio.profil === 'gestion' || Biblio.profil === 'administration') {
    btnZone.innerHTML = `<button class="btn btn-rouge" onclick="biblioOuvrirCreation()">+ Nouvelle section</button>`;
  } else {
    btnZone.innerHTML = '';
  }
}

function biblioOuvrirCreation() {
  Biblio.sectionEnCours = null;
  const modale = document.getElementById('m-nouvelle-section');
  if (!modale) return;
  modale.querySelector('#ns-famille').value = '';
  modale.querySelector('#ns-desig').value   = '';
  modale.querySelector('#ns-nouvelle-famille-zone').style.display = 'none';
  nsViderDims();
  nsUpdateRecap();
  const noteZone = modale.querySelector('.note-statut');
  if (noteZone) {
    noteZone.innerHTML = Biblio.profil === 'administration'
      ? `<div class="note-info">✔ En tant qu'administrateur, la section sera ajoutée directement sans validation.</div>`
      : `<div class="note-attente">⏳ Cette section sera soumise à validation par l'administrateur avant d'être disponible.</div>`;
  }
  modale.classList.add('open');
}

function biblioOuvrirEdition(idSec) {
  const section = biblioTrouverSection(idSec);
  if (!section) return;
  Biblio.sectionEnCours = section;
  const modale = document.getElementById('m-nouvelle-section');
  if (!modale) return;
  const selFamille = modale.querySelector('#ns-famille');
  if (selFamille) selFamille.value = section.famille;
  const inputDesig = modale.querySelector('#ns-desig');
  if (inputDesig) inputDesig.value = section.desig;
  nsUpdateFamille();
  nsRemplirDims(section);
  nsUpdateRecap();
  modale.classList.add('open');
}

function biblioSoumettre() {
  const modale = document.getElementById('m-nouvelle-section');
  if (!modale) return;
  const famille = modale.querySelector('#ns-famille').value;
  const desig   = modale.querySelector('#ns-desig').value.trim();
  if (!famille || !desig) { alert('Veuillez renseigner la famille et la désignation.'); return; }
  const dims = nsLireDims();
  const nouvSection = {
    famille, desig, ...dims,
    source: 'custom',
    statut: Biblio.profil === 'administration' ? 'valide' : 'attente',
    dateCreation: new Date().toISOString().split('T')[0],
    creePar: window.AUTH ? window.AUTH.utilisateur : 'inconnu'
  };
  if (Biblio.sectionEnCours) {
    const idx = Biblio.data.custom.findIndex(
      s => s.famille === Biblio.sectionEnCours.famille && s.desig === Biblio.sectionEnCours.desig
    );
    if (idx >= 0) {
      if (Biblio.profil !== 'administration') nouvSection.statut = 'attente';
      Biblio.data.custom[idx] = nouvSection;
    }
  } else {
    Biblio.data.custom.push(nouvSection);
  }
  biblioSauvegarder();
  modale.classList.remove('open');
  biblioRendreGrille();
  const msg = nouvSection.statut === 'attente'
    ? 'Section soumise à validation administrateur.'
    : 'Section ajoutée directement à la bibliothèque.';
  biblioNotification(msg, nouvSection.statut === 'attente' ? 'attente' : 'succes');
}

/* ══════════════════════════════════════════════
   VALIDATION ADMIN
══════════════════════════════════════════════ */

function biblioValiderSection(idSec) {
  if (Biblio.profil !== 'administration') return;
  const section = biblioTrouverSectionCustom(idSec);
  if (!section) return;
  section.statut = 'valide';
  section.dateValidation = new Date().toISOString().split('T')[0];
  biblioSauvegarder();
  biblioRendreGrille();
  biblioNotification(`Section ${section.famille} ${section.desig} validée.`, 'succes');
}

function biblioRefuserSection(idSec) {
  if (Biblio.profil !== 'administration') return;
  if (!confirm('Confirmer le refus de cette section ?')) return;
  const parts   = idSec.replace('custom_', '').split('_');
  const famille = parts[0];
  const desig   = parts.slice(1).join('_').replace(/_/g, ' ');
  Biblio.data.custom = Biblio.data.custom.filter(
    s => !(s.famille === famille && s.desig.replace(/[^a-zA-Z0-9]/g, '_') === desig)
  );
  biblioSauvegarder();
  biblioRendreGrille();
  biblioNotification('Section refusée et supprimée.', 'erreur');
}

/* ══════════════════════════════════════════════
   PERSISTANCE
══════════════════════════════════════════════ */

function biblioSauvegarder() {
  try {
    localStorage.setItem('lbf_sections_custom', JSON.stringify(Biblio.data.custom));
  } catch (e) {
    console.warn('Impossible de sauvegarder en localStorage', e);
  }
}

function biblioChargerCustom() {
  try {
    const data = localStorage.getItem('lbf_sections_custom');
    if (data) Biblio.data.custom = JSON.parse(data);
  } catch (e) {
    console.warn('Impossible de charger les sections custom', e);
  }
}

/* ══════════════════════════════════════════════
   GÉNÉRATEURS SVG
══════════════════════════════════════════════ */

function biblioSchemasFamille(famId) {
  const S = '#5a6a7a', F = '#c2d0dc', FL = '#a0b4c4';
  const schemas = {
    'IPE': [
      { label: 'IPE',   svg: _svgIPE(60, 56, F, FL, S, 44, 8)  },
      { label: 'IPE A', svg: _svgIPE(60, 56, '#c8dce8', '#aacce0', S, 44, 6) },
      { label: 'IPN',   svg: _svgIPN(60, 56, F, FL, S) }
    ],
    'HE': [
      { label: 'HEA',  svg: _svgHE(60, 56, F, FL, S, 56, 9)  },
      { label: 'HEB',  svg: _svgHE(60, 56, '#b8c8d4', '#9ab4c4', S, 56, 13) },
      { label: 'HEM',  svg: _svgHE(60, 56, '#a8bcc8', '#8aaab8', S, 56, 20) }
    ],
    'U': [
      { label: 'UPN', svg: _svgUPN(60, 56, F, FL, S, false) },
      { label: 'UPE', svg: _svgUPN(60, 56, '#c2d8e8', '#a4c4d8', S, true) }
    ],
    'Cornière': [
      { label: 'L égale',   svg: _svgCorn(60, 56, F, FL, S, true)  },
      { label: 'L inégale', svg: _svgCorn(60, 56, '#c8d8a0', '#b0c888', S, false) }
    ]
  };
  const list = schemas[famId] || [];
  return list.map(sc => `
    <div class="cfam-schema-item">
      <svg width="60" height="56" viewBox="0 0 60 56" xmlns="http://www.w3.org/2000/svg">${sc.svg}</svg>
      <span class="cfam-schema-label">${sc.label}</span>
    </div>`).join('');
}

function _svgIPE(w, h, f, fl, s, bw, tf) {
  const cx = w/2, tw = 5, aw = bw, ah = h - 2*tf;
  return `
    <rect x="${cx-aw/2}" y="0"       width="${aw}" height="${tf}" fill="${fl}" stroke="${s}" stroke-width="1"/>
    <rect x="${cx-aw/2}" y="${h-tf}" width="${aw}" height="${tf}" fill="${fl}" stroke="${s}" stroke-width="1"/>
    <rect x="${cx-tw/2}" y="${tf}"   width="${tw}"  height="${ah}" fill="${f}"  stroke="${s}" stroke-width="1"/>`;
}
function _svgIPN(w, h, f, fl, s) {
  const cx = w/2;
  return `
    <polygon points="${cx-22},0 ${cx+22},0 ${cx+22},8 ${cx-22},8"   fill="${fl}" stroke="${s}" stroke-width="1"/>
    <polygon points="${cx-16},${h-8} ${cx+16},${h-8} ${cx+16},${h} ${cx-16},${h}" fill="${fl}" stroke="${s}" stroke-width="1"/>
    <rect x="${cx-3}" y="8" width="6" height="${h-16}" fill="${f}" stroke="${s}" stroke-width="1"/>`;
}
function _svgHE(w, h, f, fl, s, bw, tf) {
  const cx = w/2, tw = 7, ah = h - 2*tf;
  return `
    <rect x="${cx-bw/2}" y="0"       width="${bw}" height="${tf}" fill="${fl}" stroke="${s}" stroke-width="1"/>
    <rect x="${cx-bw/2}" y="${h-tf}" width="${bw}" height="${tf}" fill="${fl}" stroke="${s}" stroke-width="1"/>
    <rect x="${cx-tw/2}" y="${tf}"   width="${tw}"  height="${ah}" fill="${f}"  stroke="${s}" stroke-width="1"/>`;
}
function _svgUPN(w, h, f, fl, s, upe) {
  const cx = w/2, bw = 44, tf = upe ? 7 : 8;
  return `
    <rect x="${cx-bw/2}" y="0"       width="${bw}" height="${tf}" fill="${fl}" stroke="${s}" stroke-width="1"/>
    <rect x="${cx-bw/2}" y="${h-tf}" width="${bw}" height="${tf}" fill="${fl}" stroke="${s}" stroke-width="1"/>
    <rect x="${cx-bw/2}" y="${tf}"   width="8"     height="${h-2*tf}" fill="${f}" stroke="${s}" stroke-width="1"/>`;
}
function _svgCorn(w, h, f, fl, s, egale) {
  const a = 40, b = egale ? 40 : 28, e = 6, ox = 10, oy = h - a;
  return `
    <rect x="${ox}" y="${oy}"     width="${b}" height="${e}" fill="${fl}" stroke="${s}" stroke-width="1"/>
    <rect x="${ox}" y="${oy-a+e}" width="${e}" height="${a}" fill="${f}"  stroke="${s}" stroke-width="1"/>`;
}

function biblioSvgMini(famille, w, h) {
  const S = '#445', F = '#b8cad8';
  let formes = '';
  const cx = w / 2, cy = h / 2;
  switch (famille) {
    case 'Profilés I': case 'IPE':
      formes = `
        <rect x="${cx-22}" y="4"       width="44" height="8"  fill="${F}" stroke="${S}" stroke-width="1.2"/>
        <rect x="${cx-22}" y="${h-12}" width="44" height="8"  fill="${F}" stroke="${S}" stroke-width="1.2"/>
        <rect x="${cx-4}"  y="12"      width="8"  height="${h-24}" fill="${F}" stroke="${S}" stroke-width="1.2"/>`;
      break;
    case 'Profilés H': case 'HE':
      formes = `
        <rect x="${cx-30}" y="4"       width="60" height="9"  fill="${F}" stroke="${S}" stroke-width="1.2"/>
        <rect x="${cx-30}" y="${h-13}" width="60" height="9"  fill="${F}" stroke="${S}" stroke-width="1.2"/>
        <rect x="${cx-5}"  y="13"      width="10" height="${h-26}" fill="${F}" stroke="${S}" stroke-width="1.2"/>`;
      break;
    case 'Profilés U': case 'U':
      formes = `
        <rect x="${cx-25}" y="4"       width="50" height="8"  fill="${F}" stroke="${S}" stroke-width="1.2"/>
        <rect x="${cx-25}" y="${h-12}" width="50" height="8"  fill="${F}" stroke="${S}" stroke-width="1.2"/>
        <rect x="${cx-25}" y="12"      width="9"  height="${h-24}" fill="${F}" stroke="${S}" stroke-width="1.2"/>`;
      break;
    case 'Cornière':
      formes = `
        <rect x="10" y="${h-16}" width="${w-16}" height="8" fill="${F}" stroke="${S}" stroke-width="1.2"/>
        <rect x="10" y="6"       width="8" height="${h-16}" fill="${F}" stroke="${S}" stroke-width="1.2"/>`;
      break;
    case 'Plat':
      formes = `<rect x="6" y="${cy-8}" width="${w-12}" height="16" fill="${F}" stroke="${S}" stroke-width="1.2"/>`;
      break;
    default:
      formes = `<rect x="10" y="10" width="${w-20}" height="${h-20}" fill="${F}" stroke="${S}" stroke-width="1.2" rx="2"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${formes}</svg>`;
}

function biblioSvgCote(section, w, h) {
  const S = '#333', F = '#c8d4de', R = '#d22323';
  const ns = 'http://www.w3.org/2000/svg';
  let inner = '';
  const e = (tag, attrs, txt = '') => {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<${tag} ${a}>${txt}</${tag}>`;
  };
  const ligne = (x1, y1, x2, y2, c = R, dw = 1) =>
    e('line', { x1, y1, x2, y2, stroke: c, 'stroke-width': dw });
  const texte = (x, y, txt, anc = 'middle', rot = '') =>
    e('text', { x, y, 'font-size': 9, fill: R, 'font-family': 'Tahoma', 'text-anchor': anc,
      transform: rot ? `rotate(${rot},${x},${y})` : '' }, txt);
  const fleche = (x1, y1, x2, y2, lbl, lx, ly, rot = '') => `
    ${ligne(x1, y1, x2, y2)}
    ${ligne(x1 - 4, y1, x1 + 4, y1)}
    ${ligne(x2 - 4, y2, x2 + 4, y2)}
    ${texte(lx, ly, lbl, 'middle', rot)}`;

  switch (section.famille) {
    case 'Profilés I': case 'Profilés H': {
      const bw = section.famille === 'IPE' ? 90 : 110;
      const ox = (w - bw) / 2;
      const th = section.famille === 'HEB' ? 18 : 13;
      const tw = section.tw || 6;
      inner += e('rect', { x: ox, y: 18, width: bw, height: th, fill: F, stroke: S, 'stroke-width': 1.5 });
      inner += e('rect', { x: ox, y: h - 18 - th, width: bw, height: th, fill: F, stroke: S, 'stroke-width': 1.5 });
      inner += e('rect', { x: ox + bw / 2 - tw / 2, y: 18 + th, width: tw, height: h - 36 - 2 * th, fill: F, stroke: S, 'stroke-width': 1.5 });
      inner += fleche(12, 18, 12, h - 18, 'h', 5, h / 2, '-90');
      inner += fleche(ox, h - 5, ox + bw, h - 5, 'b', ox + bw / 2, h - 1);
      break;
    }
    case 'Profilés U': {
      const bw = 80, bh = h - 36, ox = (w - bw) / 2;
      inner += e('rect', { x: ox, y: 18, width: bw, height: 12, fill: F, stroke: S, 'stroke-width': 1.5 });
      inner += e('rect', { x: ox, y: h - 30, width: bw, height: 12, fill: F, stroke: S, 'stroke-width': 1.5 });
      inner += e('rect', { x: ox, y: 30, width: 10, height: bh - 24, fill: F, stroke: S, 'stroke-width': 1.5 });
      inner += fleche(12, 18, 12, h - 18, 'h', 5, h / 2, '-90');
      inner += fleche(ox, h - 4, ox + bw, h - 4, 'b', ox + bw / 2, h - 1);
      break;
    }
    case 'Cornière': {
      inner += e('rect', { x: 30, y: h - 30, width: w - 40, height: 12, fill: F, stroke: S, 'stroke-width': 1.5 });
      inner += e('rect', { x: 30, y: 18, width: 12, height: h - 36, fill: F, stroke: S, 'stroke-width': 1.5 });
      inner += fleche(12, 18, 12, h - 18, 'a', 5, h / 2, '-90');
      break;
    }
    case 'Plat': {
      inner += e('rect', { x: 20, y: h / 2 - 20, width: w - 40, height: 40, fill: F, stroke: S, 'stroke-width': 1.5 });
      inner += fleche(20, h - 5, w - 20, h - 5, 'b', w / 2, h - 1);
      inner += fleche(w - 8, h / 2 - 20, w - 8, h / 2 + 20, 'e', w - 2, h / 2);
      break;
    }
    default:
      inner += e('rect', { x: 20, y: 20, width: w - 40, height: h - 40, fill: F, stroke: S, 'stroke-width': 1.5, rx: 3 });
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="${ns}">${inner}</svg>`;
}

/* ══════════════════════════════════════════════
   HELPERS MODALE NOUVELLE SECTION
══════════════════════════════════════════════ */

function nsUpdateFamille() {
  const modale   = document.getElementById('m-nouvelle-section');
  if (!modale) return;
  const val      = modale.querySelector('#ns-famille').value;
  const nfZone   = modale.querySelector('#ns-nouvelle-famille-zone');
  const dimsZone = modale.querySelector('#ns-dims-zone');
  nfZone.style.display = val === 'nouveau' ? 'block' : 'none';
  if (dimsZone) dimsZone.innerHTML = nsChampsDims(val);
  nsUpdateRecap();
}

function nsChampsDims(famille) {
  const f = (id, label, ph) => `
    <div class="fr">
      <label>${label}</label>
      <input type="number" id="ns-${id}" placeholder="${ph}" step="0.1" oninput="nsUpdateRecap()">
    </div>`;
  switch (famille) {
    case 'Profilés I': case 'Profilés H':
      return f('h','h — Hauteur (mm)','200') + f('b','b — Largeur aile (mm)','100')
           + f('tw','tw — Ép. âme (mm)','5.6') + f('tf','tf — Ép. aile (mm)','8.5')
           + f('r','r — Congé (mm)','12') + f('pml','Poids/ml (kg/m)','22.4');
    case 'Profilés U':
      return f('h','h — Hauteur (mm)','120') + f('b','b — Largeur (mm)','55')
           + f('tw','tw — Ép. âme (mm)','7') + f('tf','tf — Ép. aile (mm)','9')
           + f('pml','Poids/ml (kg/m)','13.4');
    case 'Cornière':
      return f('a','a — Côté (mm)','100') + f('t','t — Épaisseur (mm)','10') + f('pml','Poids/ml (kg/m)','15');
    case 'Plat':
      return f('b','b — Largeur (mm)','100') + f('e','e — Épaisseur (mm)','10') + f('pml','Poids/ml (kg/m)','7.85');
    default:
      return f('h','h — Hauteur (mm)','') + f('b','b — Largeur (mm)','') + f('pml','Poids/ml (kg/m)','');
  }
}

function nsLireDims() {
  const lire = id => { const el = document.getElementById(`ns-${id}`); return el ? (parseFloat(el.value) || undefined) : undefined; };
  return { h: lire('h'), b: lire('b'), tw: lire('tw'), tf: lire('tf'), r: lire('r'), a: lire('a'), t: lire('t'), e: lire('e'), pml: lire('pml') };
}

function nsViderDims() {
  ['h','b','tw','tf','r','a','t','e','pml'].forEach(id => {
    const el = document.getElementById(`ns-${id}`);
    if (el) el.value = '';
  });
}

function nsRemplirDims(section) {
  const remplir = (id, val) => { const el = document.getElementById(`ns-${id}`); if (el && val !== undefined) el.value = val; };
  remplir('h', section.h); remplir('b', section.b); remplir('tw', section.tw);
  remplir('tf', section.tf); remplir('r', section.r); remplir('a', section.a);
  remplir('t', section.t); remplir('e', section.e); remplir('pml', section.pml);
}

function nsUpdateRecap() {
  const modale = document.getElementById('m-nouvelle-section');
  if (!modale) return;
  const getVal = id => { const el = modale.querySelector(`#ns-${id}`); return el ? el.value || '—' : '—'; };
  const recap  = modale.querySelector('.ns-recap');
  if (!recap) return;
  const famille = modale.querySelector('#ns-famille').value || '—';
  const desig   = modale.querySelector('#ns-desig').value   || '—';
  recap.innerHTML = `
    <div class="dim-row"><span class="dim-label">Famille</span>    <span class="dim-val">${famille}</span></div>
    <div class="dim-row"><span class="dim-label">Désignation</span><span class="dim-val">${desig}</span></div>
    <div class="dim-row"><span class="dim-label">h</span>           <span class="dim-val">${getVal('h')}</span></div>
    <div class="dim-row"><span class="dim-label">b</span>           <span class="dim-val">${getVal('b')}</span></div>
    <div class="dim-row"><span class="dim-label">Poids/ml</span>    <span class="dim-val">${getVal('pml')}</span></div>`;
}

/* ══════════════════════════════════════════════
   UTILITAIRES
══════════════════════════════════════════════ */

function biblioTrouverSection(idSec) {
  return biblioGetSectionsFiltrees().find(s => {
    const id = `${s.source}_${s.famille}_${s.desig}`.replace(/[^a-zA-Z0-9_]/g, '_');
    return id === idSec;
  }) || null;
}

function biblioTrouverSectionCustom(idSec) {
  return Biblio.data.custom.find(s => {
    const id = `custom_${s.famille}_${s.desig}`.replace(/[^a-zA-Z0-9_]/g, '_');
    return id === idSec;
  }) || null;
}

function biblioDescriptionType(type) {
  const map = {
    profil_I:       'Profilé en I à ailes parallèles',
    profil_H:       'Profilé en H à ailes larges',
    profil_U:       'Profilé en U (poutrelle)',
    corniere_egale: 'Cornière à ailes égales',
    plat:           'Plat laminé'
  };
  return map[type] || type || '';
}

function biblioNotification(message, type = 'succes') {
  let notif = document.getElementById('biblio-notif');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'biblio-notif';
    notif.style.cssText = `
      position:fixed; bottom:20px; right:20px; z-index:9999;
      padding:12px 18px; border-radius:4px; font-family:Tahoma;
      font-size:13px; font-weight:bold; max-width:320px;
      box-shadow:0 4px 16px rgba(0,0,0,0.25); transition: opacity .4s;`;
    document.body.appendChild(notif);
  }
  const couleurs = {
    succes:  { bg: 'rgb(45,95,50)',  texte: 'white' },
    attente: { bg: '#856404',        texte: 'white' },
    erreur:  { bg: 'rgb(210,35,42)', texte: 'white' }
  };
  const c = couleurs[type] || couleurs.succes;
  notif.style.background = c.bg;
  notif.style.color      = c.texte;
  notif.style.opacity    = '1';
  notif.textContent      = message;
  clearTimeout(notif._timer);
  notif._timer = setTimeout(() => { notif.style.opacity = '0'; }, 3000);
}

/* ══════════════════════════════════════════════
   DONNÉES DE DÉMO
══════════════════════════════════════════════ */
const SECTIONS_DEMO = {
  standard: [
    {
      famille: 'IPE', type: 'profil_I', norme: 'EN 10034',
      sections: [
        { desig:'200', h:200, b:100, tw:5.6, tf:8.5, r:12, pml:22.4, A:28.5 },
        { desig:'240', h:240, b:120, tw:6.2, tf:9.8, r:15, pml:30.7, A:39.1 },
        { desig:'300', h:300, b:150, tw:7.1, tf:10.7,r:15, pml:42.2, A:53.8 }
      ]
    },
    {
      famille: 'HEA', type: 'profil_H', norme: 'EN 10034',
      sections: [
        { desig:'160', h:152, b:160, tw:6.0, tf:9.0, r:15, pml:30.4, A:38.8 },
        { desig:'200', h:190, b:200, tw:6.5, tf:10.0,r:18, pml:42.3, A:53.8 }
      ]
    },
    {
      famille: 'UPN', type: 'profil_U', norme: 'EN 10279',
      sections: [
        { desig:'120', h:120, b:55, tw:7.0, tf:9.0, r:9, pml:13.4, A:17.0 }
      ]
    }
  ],
  custom: []
};
