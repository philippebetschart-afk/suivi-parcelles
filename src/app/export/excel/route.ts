import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargerRegistre } from "@/lib/registre";
import { chargerBilanDomaine } from "@/lib/bilan-domaine";
import { LIBELLES_INTERVENTION } from "@/lib/interventions";
import { LIBELLES_MATIERE } from "@/lib/produits";
import { LIBELLES_TYPE } from "@/lib/parcelles";
import { NB_ANNEES_LISSAGE } from "@/lib/bilans";

const FORMAT_DATE = "dd/mm/yyyy";

// AAAA-MM-JJ → date Excel
function dateExcel(iso: string): Date {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j));
}

// Horodatage → date et heure de Paris (Excel n'a pas de fuseau horaire).
function dateHeureParis(iso: string): Date {
  const t = new Date(iso).toLocaleString("sv-SE", { timeZone: "Europe/Paris" });
  const [j, h] = t.split(" ");
  const [a, m, d] = j.split("-").map(Number);
  const [hh, mm, ss] = h.split(":").map(Number);
  return new Date(Date.UTC(a, m - 1, d, hh, mm, ss));
}

// Feuille avec une ligne d'en-tête en gras, figée, et des filtres.
function feuille(
  classeur: ExcelJS.Workbook,
  nom: string,
  colonnes: { header: string; key: string; width: number; style?: Partial<ExcelJS.Style> }[],
) {
  const f = classeur.addWorksheet(nom, { views: [{ state: "frozen", ySplit: 1 }] });
  f.columns = colonnes;
  f.getRow(1).font = { bold: true };
  f.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colonnes.length } };
  return f;
}

export async function GET(request: NextRequest) {
  const du = request.nextUrl.searchParams.get("du") ?? "";
  const au = request.nextUrl.searchParams.get("au") ?? "";

  const supabase = await createClient();
  const [registre, bilan, parcelles, produits, modifications] = await Promise.all([
    chargerRegistre(supabase, du, au),
    chargerBilanDomaine(supabase),
    supabase
      .from("parcelles")
      .select("id, nom, type_parcelle, surface_ha, cepage, annee_plantation, remarques, archivee"),
    supabase
      .from("produits")
      .select("id, nom, unite, matiere_active, teneur_g_par_unite, remarques, archive"),
    supabase
      .from("intervention_modifications")
      .select("intervention_id, modifie_le, ancienne_valeur")
      .order("modifie_le"),
  ]);

  const erreur =
    registre.erreur ?? bilan.erreur ?? parcelles.error ?? produits.error ?? modifications.error;
  if (erreur) {
    return new Response(`Export impossible : ${erreur.message}`, { status: 500 });
  }

  const classeur = new ExcelJS.Workbook();
  classeur.creator = "Suivi parcellaire – Domaine de Viaud";
  classeur.created = new Date();

  // 1. Registre
  const fReg = feuille(classeur, "Registre", [
    { header: "Date", key: "date", width: 12, style: { numFmt: FORMAT_DATE } },
    { header: "Type", key: "type", width: 13 },
    { header: "Parcelle", key: "parcelle", width: 15 },
    { header: "Cépage / culture", key: "cepage", width: 16 },
    { header: "Surface (ha)", key: "surface", width: 12, style: { numFmt: "0.0000" } },
    { header: "Produit", key: "produit", width: 18 },
    { header: "N° de lot", key: "lot", width: 14 },
    { header: "Dose /ha", key: "dose", width: 10, style: { numFmt: "0.###" } },
    { header: "Unité", key: "unite", width: 7 },
    { header: "Quantité appliquée", key: "quantite", width: 12, style: { numFmt: "0.00" } },
    { header: "Matière active", key: "matiere", width: 13 },
    { header: "Matière active (kg/ha)", key: "kgma", width: 13, style: { numFmt: "0.000" } },
    { header: "Cible / justification", key: "cible", width: 20 },
    { header: "Remarques", key: "remarques", width: 30 },
    { header: "N° intervention", key: "id", width: 10 },
    { header: "Modifiée le", key: "modifiee", width: 12, style: { numFmt: FORMAT_DATE } },
  ]);
  for (const l of registre.lignes) {
    fReg.addRow({
      date: dateExcel(l.date),
      type: LIBELLES_INTERVENTION[l.type],
      parcelle: l.parcelle,
      cepage: l.cepage,
      surface: l.surfaceHa,
      produit: l.produit,
      lot: l.numeroLot,
      dose: l.doseParHa,
      unite: l.unite,
      quantite: l.quantite,
      matiere: l.matiere ? LIBELLES_MATIERE[l.matiere] : null,
      kgma:
        l.matiere && l.matiere !== "autre"
          ? (l.kgMatiereParHa ?? "teneur inconnue")
          : null,
      cible: l.cible,
      remarques: l.remarques,
      id: l.interventionId,
      modifiee: l.derniereModification ? dateHeureParis(l.derniereModification) : null,
    });
  }

  // 2. Cumuls par parcelle (sur la période exportée)
  const fCum = feuille(classeur, "Cumuls par parcelle", [
    { header: "Parcelle", key: "parcelle", width: 15 },
    { header: "Année", key: "annee", width: 8 },
    { header: "Cuivre (kg/ha)", key: "cuivre", width: 14, style: { numFmt: "0.00" } },
    { header: "Azote (unités N/ha)", key: "azote", width: 16, style: { numFmt: "0.0" } },
    { header: "Produits sans teneur", key: "inconnues", width: 18 },
  ]);
  for (const c of registre.cumulsParcelles) {
    fCum.addRow({
      parcelle: c.parcelle,
      annee: c.annee,
      cuivre: c.cuivre,
      azote: c.azote,
      inconnues: c.teneursInconnues || null,
    });
  }

  // 3. Bilan cuivre du domaine sur 7 ans
  const fBil = feuille(classeur, "Bilan cuivre domaine", [
    { header: "Année", key: "annee", width: 10 },
    { header: "Cuivre (kg/ha, moyenne vignes)", key: "cuivre", width: 28, style: { numFmt: "0.00" } },
    { header: "Source", key: "source", width: 34 },
  ]);
  for (const l of [...bilan.lignes7ans].reverse()) {
    fBil.addRow({
      annee: l.annee,
      cuivre: l.vide ? null : l.retenu,
      source:
        l.saisie !== undefined
          ? "valeur déclarée (saisie)"
          : l.calcule !== undefined
            ? "calcul à partir des interventions"
            : "aucune donnée",
    });
  }
  fBil.addRow({});
  fBil.addRow({ annee: `Total ${NB_ANNEES_LISSAGE} ans`, cuivre: bilan.total7ans });
  fBil.addRow({ annee: "Moyenne / an", cuivre: bilan.total7ans / NB_ANNEES_LISSAGE });
  fBil.addRow({ annee: "Plafond 7 ans", cuivre: bilan.parametres.plafond_cuivre_7ans });
  fBil.addRow({ annee: "Surface de vigne (ha)", cuivre: bilan.surfaceVignes });
  fBil.getColumn("annee").width = 22;

  // 4. Parcelles
  const fPar = feuille(classeur, "Parcelles", [
    { header: "N°", key: "id", width: 6 },
    { header: "Nom", key: "nom", width: 15 },
    { header: "Type", key: "type", width: 10 },
    { header: "Surface (ha)", key: "surface", width: 12, style: { numFmt: "0.0000" } },
    { header: "Cépage / culture", key: "cepage", width: 16 },
    { header: "Année de plantation", key: "annee", width: 12 },
    { header: "Archivée", key: "archivee", width: 9 },
    { header: "Remarques", key: "remarques", width: 50 },
  ]);
  for (const p of (parcelles.data ?? []).sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr", { numeric: true }),
  )) {
    fPar.addRow({
      id: p.id,
      nom: p.nom,
      type: LIBELLES_TYPE[p.type_parcelle as keyof typeof LIBELLES_TYPE],
      surface: Number(p.surface_ha),
      cepage: p.cepage,
      annee: p.annee_plantation,
      archivee: p.archivee ? "oui" : "",
      remarques: p.remarques,
    });
  }

  // 5. Produits
  const fPro = feuille(classeur, "Produits", [
    { header: "N°", key: "id", width: 6 },
    { header: "Nom", key: "nom", width: 18 },
    { header: "Unité", key: "unite", width: 7 },
    { header: "Matière active", key: "matiere", width: 13 },
    { header: "Teneur (g par L ou kg)", key: "teneur", width: 18 },
    { header: "Archivé", key: "archive", width: 9 },
    { header: "Remarques", key: "remarques", width: 40 },
  ]);
  for (const p of (produits.data ?? []).sort((a, b) => a.nom.localeCompare(b.nom, "fr"))) {
    fPro.addRow({
      id: p.id,
      nom: p.nom,
      unite: p.unite,
      matiere: LIBELLES_MATIERE[p.matiere_active as keyof typeof LIBELLES_MATIERE],
      teneur: p.teneur_g_par_unite === null ? null : Number(p.teneur_g_par_unite),
      archive: p.archive ? "oui" : "",
      remarques: p.remarques,
    });
  }

  // 6. Cuivre des années passées
  const fHist = feuille(classeur, "Cuivre années passées", [
    { header: "Année", key: "annee", width: 8 },
    { header: "Cuivre (kg/ha)", key: "kg", width: 14, style: { numFmt: "0.000" } },
    { header: "Remarques", key: "remarques", width: 40 },
  ]);
  for (const h of [...bilan.historique].reverse()) {
    fHist.addRow({ annee: h.annee, kg: Number(h.kg_cu_par_ha), remarques: h.remarques });
  }

  // 7. Trace des modifications (version d'avant, complète)
  const fMod = feuille(classeur, "Modifications", [
    { header: "N° intervention", key: "id", width: 10 },
    { header: "Modifiée le", key: "le", width: 18, style: { numFmt: "dd/mm/yyyy hh:mm" } },
    { header: "Version d'avant (données complètes)", key: "avant", width: 120 },
  ]);
  for (const m of modifications.data ?? []) {
    fMod.addRow({
      id: m.intervention_id,
      le: dateHeureParis(m.modifie_le),
      avant: JSON.stringify(m.ancienne_valeur),
    });
  }

  const contenu = await classeur.xlsx.writeBuffer();
  const periode = du || au ? `_${du || "debut"}_${au || "fin"}` : "_complet";
  return new Response(contenu, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="registre-viaud${periode}.xlsx"`,
    },
  });
}
