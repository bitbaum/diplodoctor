import type { Locale } from "@/i18n/routing";
import { parseReport, type ReportFile } from "./report";

/**
 * The worked example. EVERY PERSONAL DETAIL IN IT IS INVENTED.
 *
 * It is a Swiss laboratory report of the kind most people actually hold: a
 * table of values with printed reference ranges, in German, with a few values
 * outside them. No real person's name, birth date or order number belongs in
 * this repository, which is public.
 *
 * The report itself is one fixed German text; what Diplodoctor says ABOUT it is
 * written per reader language, exactly as a real reading would be. The flags are
 * not written here at all: they come out of the numbers, through the same
 * `parseReport` every reading goes through. The same German text is what
 * `pnpm run check:analyze` sends to a real model.
 */
export const SAMPLE_REPORT = `Medizinisches Labor Beispiel AG
Laborbericht

Patientin: Erika Muster, geboren 14.03.1985
Auftragsnummer: 2026-091415
Entnahme: 14.09.2026    Bericht: 15.09.2026

Hämatologie
Hämoglobin          118    g/L       120 - 160      L
Erythrozyten        4.1    T/L       3.9 - 5.2
Leukozyten          6.3    G/L       3.5 - 10.0
Thrombozyten        245    G/L       150 - 400

Eisenstoffwechsel
Ferritin            14     µg/L      15 - 150       L

Stoffwechsel
HbA1c               5.4    %         4.0 - 5.6
LDL-Cholesterin     3.9    mmol/L    < 3.0          H
HDL-Cholesterin     1.6    mmol/L    > 1.2
Triglyceride        1.1    mmol/L    < 1.7

Schilddrüse
TSH                 2.1    mIU/L     0.4 - 4.0

Vitamine
25-OH-Vitamin D     18     µg/L      30 - 100       L`;

/** The values the sample states that are outside their range, for the live check to compare against. */
export const SAMPLE_FLAGGED = [
  "Hämoglobin",
  "Ferritin",
  "LDL-Cholesterin",
  "25-OH-Vitamin D",
] as const;

type Row = [
  name: string,
  analyte: string,
  value: string,
  unit: string,
  range: string,
  low?: number,
  high?: number,
];

const ROWS: Row[] = [
  ["Hämoglobin", "Hemoglobin", "118", "g/L", "120 - 160", 120, 160],
  ["Erythrozyten", "Red blood cells", "4.1", "T/L", "3.9 - 5.2", 3.9, 5.2],
  ["Leukozyten", "White blood cells", "6.3", "G/L", "3.5 - 10.0", 3.5, 10],
  ["Thrombozyten", "Platelets", "245", "G/L", "150 - 400", 150, 400],
  ["Ferritin", "Ferritin", "14", "µg/L", "15 - 150", 15, 150],
  ["HbA1c", "HbA1c", "5.4", "%", "4.0 - 5.6", 4, 5.6],
  ["LDL-Cholesterin", "LDL cholesterol", "3.9", "mmol/L", "< 3.0", undefined, 3],
  ["HDL-Cholesterin", "HDL cholesterol", "1.6", "mmol/L", "> 1.2", 1.2, undefined],
  ["Triglyceride", "Triglycerides", "1.1", "mmol/L", "< 1.7", undefined, 1.7],
  ["TSH", "TSH", "2.1", "mIU/L", "0.4 - 4.0", 0.4, 4],
  ["25-OH-Vitamin D", "Vitamin D (25-OH)", "18", "µg/L", "30 - 100", 30, 100],
];

/** What is said about the report, per reader language. Information, never a conclusion. */
const SAID: Record<
  Locale,
  {
    title: string;
    summary: string;
    notes: Record<"Hämoglobin" | "Ferritin" | "LDL-Cholesterin" | "25-OH-Vitamin D", string>;
    questions: string[];
    caution: string;
    reason: string;
  }
> = {
  en: {
    title: "Blood test, September 2026",
    summary:
      "A blood count and metabolic panel from a Swiss laboratory, with 11 values. Four of them are outside the range the laboratory prints.",
    notes: {
      Hämoglobin:
        "Hemoglobin carries oxygen in the blood. Values below the range are common with low iron stores, and have other causes too.",
      Ferritin:
        "Ferritin reflects the body's iron stores. A low value often goes together with a low hemoglobin; the two are usually read together.",
      "LDL-Cholesterin":
        "LDL is the part of cholesterol most tied to the long-term risk of vascular disease. How much a value above the range matters depends on a person's overall risk, which a doctor assesses.",
      "25-OH-Vitamin D":
        "Vitamin D is made in the skin with sunlight and is low in many people in winter and in northern countries.",
    },
    questions: [
      "My hemoglobin and ferritin are both below the range. Should we look for a cause, and when should I repeat the test?",
      "My LDL cholesterol is above the printed range. How does it fit with my other risk factors?",
      "My vitamin D is low. Does it need treating, and how would we check it afterwards?",
    ],
    caution:
      "Which of these matter for you depends on your history and symptoms, which only a doctor can weigh.",
    reason:
      "Four values are outside their printed range. A doctor should look at the report; nothing in it is marked critical.",
  },
  de: {
    title: "Blutuntersuchung, September 2026",
    summary:
      "Ein Blutbild mit Stoffwechselwerten aus einem Schweizer Labor, 11 Werte. Vier davon liegen ausserhalb des vom Labor angegebenen Bereichs.",
    notes: {
      Hämoglobin:
        "Hämoglobin transportiert Sauerstoff im Blut. Werte unter dem Bereich sind häufig bei knappen Eisenspeichern, haben aber auch andere Ursachen.",
      Ferritin:
        "Ferritin zeigt, wie gut die Eisenspeicher des Körpers gefüllt sind. Ein tiefer Wert geht oft mit einem tiefen Hämoglobin einher; beide werden meist zusammen beurteilt.",
      "LDL-Cholesterin":
        "LDL ist der Teil des Cholesterins, der am stärksten mit dem langfristigen Risiko für Gefässerkrankungen zusammenhängt. Wie viel ein Wert über dem Bereich bedeutet, hängt vom Gesamtrisiko ab, das eine Ärztin oder ein Arzt beurteilt.",
      "25-OH-Vitamin D":
        "Vitamin D wird in der Haut mit Sonnenlicht gebildet und ist im Winter und in nördlichen Ländern bei vielen Menschen tief.",
    },
    questions: [
      "Mein Hämoglobin und mein Ferritin liegen beide unter dem Bereich. Sollen wir nach einer Ursache suchen, und wann soll ich die Untersuchung wiederholen?",
      "Mein LDL-Cholesterin liegt über dem angegebenen Bereich. Wie passt das zu meinen übrigen Risikofaktoren?",
      "Mein Vitamin D ist tief. Muss das behandelt werden, und wie überprüfen wir es danach?",
    ],
    caution:
      "Welche dieser Werte für Sie wichtig sind, hängt von Ihrer Vorgeschichte und Ihren Beschwerden ab, die nur eine Ärztin oder ein Arzt beurteilen kann.",
    reason:
      "Vier Werte liegen ausserhalb ihres angegebenen Bereichs. Eine Ärztin oder ein Arzt sollte den Bericht ansehen; nichts darin ist als kritisch markiert.",
  },
  fr: {
    title: "Analyse de sang, septembre 2026",
    summary:
      "Une formule sanguine avec des valeurs métaboliques, issue d'un laboratoire suisse : 11 valeurs. Quatre d'entre elles sont en dehors de l'intervalle indiqué par le laboratoire.",
    notes: {
      Hämoglobin:
        "L'hémoglobine transporte l'oxygène dans le sang. Des valeurs sous l'intervalle sont fréquentes quand les réserves de fer sont basses, mais ont aussi d'autres causes.",
      Ferritin:
        "La ferritine reflète les réserves de fer du corps. Une valeur basse accompagne souvent une hémoglobine basse ; les deux se lisent généralement ensemble.",
      "LDL-Cholesterin":
        "Le LDL est la part du cholestérol la plus liée au risque à long terme de maladie vasculaire. L'importance d'une valeur au-dessus de l'intervalle dépend du risque global, qu'un médecin évalue.",
      "25-OH-Vitamin D":
        "La vitamine D est fabriquée dans la peau grâce au soleil ; elle est basse chez beaucoup de personnes en hiver et dans les pays du nord.",
    },
    questions: [
      "Mon hémoglobine et ma ferritine sont toutes deux sous l'intervalle. Faut-il chercher une cause, et quand dois-je refaire l'analyse ?",
      "Mon cholestérol LDL est au-dessus de l'intervalle indiqué. Comment cela s'articule-t-il avec mes autres facteurs de risque ?",
      "Ma vitamine D est basse. Faut-il la traiter, et comment la contrôler ensuite ?",
    ],
    caution:
      "Savoir lesquelles de ces valeurs comptent pour vous dépend de vos antécédents et de vos symptômes, que seul un médecin peut évaluer.",
    reason:
      "Quatre valeurs sont en dehors de leur intervalle indiqué. Un médecin devrait regarder le rapport ; rien n'y est marqué comme critique.",
  },
  it: {
    title: "Esame del sangue, settembre 2026",
    summary:
      "Un emocromo con valori metabolici di un laboratorio svizzero, 11 valori. Quattro sono fuori dall'intervallo indicato dal laboratorio.",
    notes: {
      Hämoglobin:
        "L'emoglobina trasporta l'ossigeno nel sangue. Valori sotto l'intervallo sono frequenti quando le riserve di ferro sono scarse, ma hanno anche altre cause.",
      Ferritin:
        "La ferritina riflette le riserve di ferro del corpo. Un valore basso si accompagna spesso a un'emoglobina bassa; di solito i due si leggono insieme.",
      "LDL-Cholesterin":
        "L'LDL è la parte del colesterolo più legata al rischio a lungo termine di malattie vascolari. Quanto conta un valore sopra l'intervallo dipende dal rischio complessivo, che valuta un medico.",
      "25-OH-Vitamin D":
        "La vitamina D si forma nella pelle con la luce del sole ed è bassa in molte persone in inverno e nei paesi del nord.",
    },
    questions: [
      "La mia emoglobina e la mia ferritina sono entrambe sotto l'intervallo. Dobbiamo cercarne la causa e quando devo ripetere l'esame?",
      "Il mio colesterolo LDL è sopra l'intervallo indicato. Come si inserisce con i miei altri fattori di rischio?",
      "La mia vitamina D è bassa. Va trattata e come la controlliamo dopo?",
    ],
    caution:
      "Quali di questi valori contino per Lei dipende dalla Sua storia clinica e dai Suoi sintomi, che solo un medico può valutare.",
    reason:
      "Quattro valori sono fuori dal loro intervallo indicato. Un medico dovrebbe guardare il referto; nulla vi è segnato come critico.",
  },
  es: {
    title: "Análisis de sangre, septiembre de 2026",
    summary:
      "Un hemograma con valores metabólicos de un laboratorio suizo, 11 valores. Cuatro están fuera del intervalo que indica el laboratorio.",
    notes: {
      Hämoglobin:
        "La hemoglobina transporta el oxígeno en la sangre. Los valores por debajo del intervalo son frecuentes cuando las reservas de hierro son bajas, pero tienen también otras causas.",
      Ferritin:
        "La ferritina refleja las reservas de hierro del cuerpo. Un valor bajo suele ir con una hemoglobina baja; normalmente se leen juntas.",
      "LDL-Cholesterin":
        "El LDL es la parte del colesterol más ligada al riesgo a largo plazo de enfermedad vascular. Cuánto importa un valor por encima del intervalo depende del riesgo global, que evalúa un médico.",
      "25-OH-Vitamin D":
        "La vitamina D se produce en la piel con la luz del sol y es baja en muchas personas en invierno y en los países del norte.",
    },
    questions: [
      "Mi hemoglobina y mi ferritina están las dos por debajo del intervalo. ¿Hay que buscar una causa y cuándo debo repetir el análisis?",
      "Mi colesterol LDL está por encima del intervalo indicado. ¿Cómo encaja con mis otros factores de riesgo?",
      "Mi vitamina D es baja. ¿Hay que tratarla y cómo la controlamos después?",
    ],
    caution:
      "Cuáles de estos valores importan en su caso depende de su historial y sus síntomas, que solo un médico puede valorar.",
    reason:
      "Cuatro valores están fuera del intervalo indicado. Un médico debería ver el informe; nada en él está marcado como crítico.",
  },
};

/** The sample as the reader's language would have it. Never stored unless the reader saves a copy. */
export function sampleReport(locale: Locale): ReportFile {
  const said = SAID[locale];
  const noteFor = (name: string) =>
    name in said.notes ? said.notes[name as keyof typeof said.notes] : undefined;
  const parsed = parseReport({
    id: "sample",
    kind: "lab",
    title: said.title,
    provider: "Medizinisches Labor Beispiel AG",
    reference: "2026-091415",
    collected: "2026-09-14",
    reported: "2026-09-15",
    summary: said.summary,
    results: ROWS.map(([name, analyte, value, unit, range, low, high]) => {
      const line = SAMPLE_REPORT.split("\n").find((l) => l.startsWith(name));
      return {
        name,
        analyte,
        value,
        unit,
        range,
        low,
        high,
        quote: line?.replace(/\s{2,}/g, "  ").trim(),
        note: noteFor(name),
      };
    }),
    questions: said.questions,
    notes: [said.caution],
    attentionReason: said.reason,
    texts: [{ lang: "de", label: "Deutsch (Original)", text: SAMPLE_REPORT }],
    createdAt: "2026-09-15T09:00:00.000Z",
  });
  if (!parsed) throw new Error("the sample report is not a valid report");
  return parsed;
}
