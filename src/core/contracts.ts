/**
 * SARI Système — Algerian employment-contract document engine and work
 * certificate ("Attestation de travail") renderer (Sections 318–321).
 *
 * Pure, side-effect-free HTML generation following Algerian notarial-style
 * conventions and the Algerian Labour Code (loi 90-11): identified parties,
 * numbered articles (nature, trial period, place of work, functions & tasks,
 * working hours, remuneration, leave, social security, mutual obligations,
 * confidentiality, discipline, termination, jurisdiction), configurable
 * job-function sections and framed dual signature blocks.
 */

export interface I18nText { fr?: string; ar?: string; en?: string }

export interface JobFunctions { id?: string; position?: I18nText; tasks?: I18nText; order?: number; isActive?: boolean }

export interface ContractPartySignature {
  name?: string; title?: string; place?: string; signedAt?: string;
  imageDataUrl?: string; userId?: string; device?: string;
}

export interface ContractLike {
  id?: string; referenceCode?: string; type?: string; title?: string; position?: string;
  startDate?: string; endDate?: string; baseSalary?: number; weeklyHours?: number;
  trialPeriodMonths?: number; clausesHtml?: string; status?: string; createdAt?: string;
  signatures?: { employee?: ContractPartySignature; company?: ContractPartySignature };
  signature?: { name?: string; signedAt?: string; device?: string };
}

export interface EmployeeLike {
  firstName?: string; lastName?: string; dateOfBirth?: string; placeOfBirth?: string;
  postalAddress?: string; cnasNumber?: string; position?: string; department?: string; hireDate?: string;
}

export interface CompanyLike {
  companyName?: string; legalName?: string; address?: string; nif?: string; rc?: string;
  nai?: string; ai?: string; nis?: string; documentLogo?: string; phone?: string; email?: string;
}

export interface CertificateLike {
  id?: string; referenceCode?: string; employeeId?: string; employeeName?: string;
  position?: string; department?: string; hireDate?: string; typeId?: string; issueDate?: string;
  includeSalary?: boolean; includeTasks?: boolean; salary?: number; notesHtml?: string; status?: string;
  signatures?: { manager?: ContractPartySignature };
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

/** French-style full datetime (e.g. « 17/08/2026 à 14:32 ») used on notarial blocks. */
export function signedDateTime(signedAt?: string, lang = 'fr'): string {
  if (!signedAt) return '—';
  const date = new Date(signedAt);
  if (isNaN(date.getTime())) return signedAt;
  const day = `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  if (lang === 'ar') return `${day} ${time}`;
  return `${day} à ${time}`;
}

const pick = (value: I18nText | undefined, lang: string): string => (value ? value[lang as 'fr' | 'ar' | 'en'] || value.fr || '' : '');

export interface ContractArticle { n: number; title: string; body: string }

export interface ContractDocumentContext {
  contract: ContractLike;
  employee: EmployeeLike;
  company: CompanyLike;
  jobTasks?: JobFunctions | null;
  lang?: string;
}

const LANG = (lang: string) => {
  const texts = {
    fr: {
      between: 'Entre les soussignés :', companyTitle: 'L’Employeur', employeeTitle: 'Le Salarié', representedBy: 'Représentée par', company: 'La société', employee: 'Le salarié',
      bornOn: 'Né(e) le', at: 'à', address: 'Adresse', cnas: 'N° CNAS', registered: 'inscrite au registre de commerce', nif: 'NIF', nai: 'NAI', nis: 'NIS', seat: 'Siège social',
      contractOf: 'CONTRAT DE TRAVAIL', reference: 'Référence', establishedOn: 'Établi le', functions: 'Fonctions et tâches du poste', specialClauses: 'Clauses particulières', signatures: 'Signatures des parties',
      signedIn: 'Fait en double exemplaire à', forCompany: 'Pour la Société', employeeSign: 'Le Salarié', page: 'Page', attested: 'ATTESTATION DE TRAVAIL',
      attestBody: 'Nous soussignés,', certify: 'certifions que', employedAs: 'est employé(e) au sein de notre société depuis le', asPosition: 'en qualité de', currentPosition: 'occupe actuellement le poste de', monthlySalary: 'et perçoit une rémunération mensuelle brute de', stillEmployed: 'Le présent certificat est délivré à l’intéressé(e) pour servir et valoir ce que de droit.', tasks: 'Fonctions et tâches exercées', hours: 'Durée hebdomadaire de travail', doneAt: 'Fait à', the: 'le', forManager: 'Pour l’employeur, le responsable', trial: 'Période d’essai', months: 'mois',
    },
    ar: {
      between: 'بين الطرفين الموقعين أدناه:', companyTitle: 'صاحب العمل', employeeTitle: 'العامل', representedBy: 'ممثلة بـ', company: 'الشركة', employee: 'العامل',
      bornOn: 'من مواليد', at: 'بـ', address: 'العنوان', cnas: 'رقم CNAS', registered: 'المسجلة في السجل التجاري', nif: 'NIF', nai: 'NAI', nis: 'NIS', seat: 'المقر الاجتماعي',
      contractOf: 'عقد عمل', reference: 'المرجع', establishedOn: 'حُرر في', functions: 'مهام ووظائف المنصب', specialClauses: 'بنود خاصة', signatures: 'توقيعات الطرفين',
      signedIn: 'حُرر في نسختين بـ', forCompany: 'عن الشركة', employeeSign: 'العامل', page: 'صفحة', attested: 'شهادة عمل',
      attestBody: 'نحن الموقعون أدناه،', certify: 'نشهد أن', employedAs: 'موظف(ة) في شركتنا منذ', asPosition: 'بصفة', currentPosition: 'يشغل حاليًا منصب', monthlySalary: 'ويتقاضى أجرًا شهريًا إجماليًا قدره', stillEmployed: 'سُلمت هذه الشهادة للمعني(ة) لاستعمالها فيما يصلح قانونًا.', tasks: 'الوظائف والمهام الممارسة', hours: 'مدة العمل الأسبوعية', doneAt: 'حُررت بـ', the: 'بتاريخ', forManager: 'عن صاحب العمل، المسؤول', trial: 'فترة التجربة', months: 'أشهر',
    },
    en: {
      between: 'Between the undersigned:', companyTitle: 'The Employer', employeeTitle: 'The Employee', representedBy: 'Represented by', company: 'The company', employee: 'The employee',
      bornOn: 'Born on', at: 'in', address: 'Address', cnas: 'CNAS No.', registered: 'registered in the trade register', nif: 'NIF', nai: 'NAI', nis: 'NIS', seat: 'Registered office',
      contractOf: 'EMPLOYMENT CONTRACT', reference: 'Reference', establishedOn: 'Established on', functions: 'Job functions and tasks', specialClauses: 'Special clauses', signatures: 'Parties’ signatures',
      signedIn: 'Done in two copies in', forCompany: 'For the Company', employeeSign: 'The Employee', page: 'Page', attested: 'WORK CERTIFICATE',
      attestBody: 'We, the undersigned,', certify: 'hereby certify that', employedAs: 'has been employed by our company since', asPosition: 'as', currentPosition: 'currently holds the position of', monthlySalary: 'and receives a gross monthly salary of', stillEmployed: 'This certificate is issued to the interested party for all legal purposes.', tasks: 'Functions and tasks performed', hours: 'Weekly working hours', doneAt: 'Done in', the: 'on', forManager: 'For the employer, the responsible manager', trial: 'Trial period', months: 'months',
    },
  };
  return texts[lang as 'fr' | 'ar' | 'en'] || texts.fr;
};

/** Algerian notarial-style articles (Section 319), including the parties' mutual obligations. */
export function contractArticles(context: ContractDocumentContext): ContractArticle[] {
  const { contract, employee, company, jobTasks } = context;
  const lang = context.lang || 'fr';
  const T = LANG(lang);
  const employeeName = [employee.firstName, employee.lastName].filter(Boolean).join(' ') || '—';
  const companyName = company.companyName || company.legalName || 'SARI SYSTÈME';
  const type = contract.type || 'CDI';
  const isFixedTerm = type === 'CDD' || type === 'CTT';
  const tasksHtml = pick(jobTasks?.tasks, lang);
  const clauses = contract.clausesHtml || '';
  const n2 = lang === 'ar' ? `يُبرم هذا العقد ${isFixedTerm ? 'لمدة محددة' : 'لمدة غير محددة'} (${type}) وفقًا للمادتين 12 وما يليهما من القانون 90-11.` : lang === 'en' ? `This contract is concluded for a${isFixedTerm ? ' fixed' : 'n indefinite'} term (${type}) pursuant to articles 12 et seq. of law 90-11.` : `Le présent contrat est conclu pour une durée ${isFixedTerm ? 'déterminée' : 'indéterminée'} (${type}) conformément aux articles 12 et suivants de la loi 90-11.`;
  const n4 = lang === 'ar' ? `يُحدد الطرفان فترة تجربة مدتها ${contract.trialPeriodMonths ?? 0} ${T.months} وفقًا للمادة 14 من القانون 90-11.` : lang === 'en' ? `The parties agree on a trial period of ${contract.trialPeriodMonths ?? 0} ${T.months} in accordance with article 14 of law 90-11.` : `Les parties conviennent d’une période d’essai de ${contract.trialPeriodMonths ?? 0} ${T.months} conformément à l’article 14 de la loi 90-11.`;
  const n5 = lang === 'ar' ? `يؤدي العامل مهامه في ${company.address || '—'} وفي أي موقع آخر تحدده الشركة وفقًا لاحتياجات النشاط.` : lang === 'en' ? `The employee performs their duties at ${company.address || '—'} and at any other site designated by the company according to business needs.` : `Le salarié exerce ses fonctions à ${company.address || '—'} et en tout autre lieu désigné par la société selon les besoins de l’activité.`;
  const n6 = lang === 'ar' ? `يُوظف العامل بصفة « ${contract.position || '—'} » ويتولى المهام التالية:<br>${tasksHtml || '—'}` : lang === 'en' ? `The employee is hired as “${contract.position || '—'}” and performs the following tasks:<br>${tasksHtml || '—'}` : `Le salarié est engagé en qualité de « ${contract.position || '—'} » et exerce les tâches suivantes :<br>${tasksHtml || '—'}`;
  const n7 = lang === 'ar' ? `تحدد مدة العمل الأسبوعية بـ ${contract.weeklyHours || 39} ساعة وفقًا للمادة 27 وما يليها من القانون 90-11 وجدول العمل المعمول به في الشركة (الأحد–الخميس).` : lang === 'en' ? `Weekly working time is set at ${contract.weeklyHours || 39} hours in accordance with article 27 et seq. of law 90-11 and the company schedule (Sunday–Thursday).` : `La durée hebdomadaire de travail est fixée à ${contract.weeklyHours || 39} heures conformément à l’article 27 et suivants de la loi 90-11 et à l’horaire en vigueur dans l’entreprise (dimanche–jeudi).`;
  const n8 = lang === 'ar' ? `يتقاضى العامل أجرًا شهريًا إجماليًا قدره ${(contract.baseSalary || 0).toLocaleString('fr-DZ')} دج، يُدفع في نهاية كل شهر عمل، وتُطبق عليه الاقتطاعات القانونية (CNAS بنسبة 9% للعامل و26% لصاحب العمل، وIRG وفق السلم).` : lang === 'en' ? `The employee receives a gross monthly salary of ${(contract.baseSalary || 0).toLocaleString('en-US')} DZD paid at the end of each worked month, subject to legal deductions (CNAS 9% employee / 26% employer, IRG per the scale).` : `Le salarié perçoit une rémunération mensuelle brute de ${(contract.baseSalary || 0).toLocaleString('fr-FR')} DA, versée à la fin de chaque mois de travail, sous réserve des retenues légales (CNAS 9 % salarié / 26 % employeur, IRG barème).`;
  const n9 = lang === 'ar' ? `يستفيد العامل من إجازة سنوية مدفوعة بواقع يومين ونصف (2.5) عن كل شهر عمل وفقًا للمادة 39 من القانون 90-11، ومن العطل الرسمية المنصوص عليها قانونًا، ومن الإجازات الخاصة المنصوص عليها في النظام الداخلي.` : lang === 'en' ? `The employee benefits from paid annual leave of two and a half (2.5) days per month of work under article 39 of law 90-11, from the legal public holidays and the special leaves set out in the internal work rules.` : `Le salarié bénéficie d’un congé annuel payé de deux jours et demi (2,5) par mois de travail conformément à l’article 39 de la loi 90-11, des jours fériés légaux et des congés spéciaux prévus par le règlement intérieur.`;
  const n10 = lang === 'ar' ? `يُصرح بالعامل لدى الصندوق الوطني للتأمينات الاجتماعية (CNAS) ابتداءً من تاريخ مباشرة العمل، وتتحمل الشركة الاشتراكات وفق النسب القانونية.` : lang === 'en' ? `The employee is declared with the national social insurance fund (CNAS) as from the start date, and the company bears the contributions at the legal rates.` : `Le salarié est déclaré auprès de la Caisse nationale des assurances sociales (CNAS) dès la prise de fonctions ; la société s’acquitte des cotisations aux taux légaux.`;
  const n11 = lang === 'ar' ? `يلتزم العامل بـ: أداء المهام بإخلاص واجتهاد؛ احترام أوقات العمل والتعليمات الداخلية؛ الحفاظ على سرية معلومات الشركة وعملائها؛ العناية بالمعدات والوثائق؛ احترام إجراءات الجودة وتتبع الأجهزة الطبية؛ التصريح بأي التزام خارجي قد يشكل تضارب مصالح.` : lang === 'en' ? 'The employee undertakes to: perform their duties loyally and diligently; comply with working hours and internal instructions; keep company and client information confidential; take care of equipment and documents; follow the quality and medical-device traceability procedures; declare any external engagement that may create a conflict of interest.' : `Le salarié s’engage à : exécuter ses tâches avec loyauté et diligence ; respecter les horaires et les consignes internes ; préserver la confidentialité des informations de l’entreprise et de ses clients ; prendre soin des équipements et documents ; respecter les procédures qualité et de traçabilité des dispositifs médicaux ; déclarer tout engagement externe susceptible de créer un conflit d’intérêts.`;
  const n12 = lang === 'ar' ? `يلتزم صاحب العمل بـ: دفع الأجر في آجاله؛ توفير ظروف عمل صحية وآمنة؛ ضمان التكوين اللازم؛ احترام التشريع الاجتماعي والاتفاقيات؛ تسليم شهادة العمل عند نهاية العلاقة.` : lang === 'en' ? 'The employer undertakes to: pay the salary on time; provide healthy and safe working conditions; ensure the necessary training; comply with social legislation and agreements; issue the work certificate at the end of the relationship.' : `L’employeur s’engage à : payer la rémunération aux échéances convenues ; assurer des conditions de travail saines et sûres ; garantir la formation nécessaire ; respecter la législation sociale et les conventions ; délivrer l’attestation de travail à la fin de la relation.`;
  const n13 = lang === 'ar' ? `كل مخالفة للالتزامات المهنية تعرض مرتكبها للعقوبات المنصوص عليها في النظام الداخلي وفي المادة 73 من القانون 90-11 (إنذار، توبيخ، توقيف، فصل).` : lang === 'en' ? `Any breach of professional obligations exposes its author to the sanctions set out in the internal rules and in article 73 of law 90-11 (warning, reprimand, suspension, dismissal).` : `Tout manquement aux obligations professionnelles expose son auteur aux sanctions prévues par le règlement intérieur et l’article 73 de la loi 90-11 (avertissement, blâme, mise à pied, licenciement).`;
  const n14 = lang === 'ar' ? `يمكن إنهاء العقد بمبادرة من أي من الطرفين مع احترام مدة الإخطار المسبق المنصوص عليها في المادتين 56 و63 من القانون 90-11، دون إخلال بالأحكام الخاصة بالفصل التعسفي.` : lang === 'en' ? 'The contract may be terminated by either party subject to the notice period set out in articles 56 and 63 of law 90-11, without prejudice to the specific provisions on unfair dismissal.' : `Le contrat peut être rompu à l’initiative de l’une ou l’autre partie moyennant le respect du préavis prévu aux articles 56 et 63 de la loi 90-11, sans préjudice des dispositions particulières relatives au licenciement abusif.`;
  const n15 = lang === 'ar' ? `كل نزاع ناشئ عن هذا العقد يخضع للاختصاص الإقليمي لمكان العمل وفقًا للتشريع الجزائري.` : lang === 'en' ? 'Any dispute arising from this contract falls under the territorial jurisdiction of the place of work under Algerian law.' : `Tout litige né du présent contrat relève de la compétence territoriale du lieu de travail conformément à la législation algérienne.`;
  const articles: ContractArticle[] = [
    { n: 1, title: lang === 'ar' ? 'الأطراف' : lang === 'en' ? 'Parties' : 'Parties', body: `${T.between}<br><b>${T.company}</b> ${companyName}, ${T.registered} ${company.rc || '—'} — ${T.nif} ${company.nif || '—'}, ${T.seat} ${company.address || '—'}<br><b>${T.employee}</b> ${employeeName}, ${T.bornOn} ${employee.dateOfBirth || '—'} ${T.at} ${employee.placeOfBirth || employee.postalAddress || '—'}, ${T.address} ${employee.postalAddress || '—'}, ${T.cnas} ${employee.cnasNumber || '—'}` },
    { n: 2, title: lang === 'ar' ? 'طبيعة العقد' : lang === 'en' ? 'Nature of the contract' : 'Nature du contrat', body: n2 },
    { n: 3, title: lang === 'ar' ? 'تاريخ بدء العمل ومدة العقد' : lang === 'en' ? 'Start date and duration' : 'Prise d’effet et durée', body: `${T.establishedOn} : ${contract.startDate || '—'}${contract.endDate ? ` — ${T.the} ${contract.endDate}` : ''}.` },
    { n: 4, title: lang === 'en' ? 'Trial period' : lang === 'ar' ? 'فترة التجربة' : 'Période d’essai', body: n4 },
    { n: 5, title: lang === 'ar' ? 'مكان العمل' : lang === 'en' ? 'Place of work' : 'Lieu de travail', body: n5 },
    { n: 6, title: T.functions, body: n6 },
    { n: 7, title: lang === 'ar' ? 'مدة العمل' : lang === 'en' ? 'Working hours' : 'Durée du travail', body: n7 },
    { n: 8, title: lang === 'ar' ? 'الأجر' : lang === 'en' ? 'Remuneration' : 'Rémunération', body: n8 },
    { n: 9, title: lang === 'ar' ? 'الإجازات والعطل' : lang === 'en' ? 'Leave and holidays' : 'Congés et jours fériés', body: n9 },
    { n: 10, title: lang === 'ar' ? 'الحماية الاجتماعية' : lang === 'en' ? 'Social security' : 'Protection sociale', body: n10 },
    { n: 11, title: lang === 'ar' ? 'التزامات العامل' : lang === 'en' ? 'Employee’s obligations' : 'Obligations du salarié', body: n11 },
    { n: 12, title: lang === 'ar' ? 'التزامات صاحب العمل' : lang === 'en' ? 'Employer’s obligations' : 'Obligations de l’employeur', body: n12 },
    { n: 13, title: lang === 'ar' ? 'الانضباط' : lang === 'en' ? 'Discipline' : 'Discipline', body: n13 },
    { n: 14, title: lang === 'ar' ? 'إنهاء العلاقة والإخطار المسبق' : lang === 'en' ? 'Termination and notice' : 'Rupture et préavis', body: n14 },
    { n: 15, title: lang === 'ar' ? 'الاختصاص القضائي' : lang === 'en' ? 'Jurisdiction' : 'Juridiction compétente', body: n15 },
  ];
  if (clauses) articles.push({ n: 16, title: T.specialClauses, body: clauses });
  articles.push({ n: clauses ? 17 : 16, title: T.signatures, body: `${T.signedIn} ${company.address || '—'}, ${T.the} ${new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR')}.` });
  return articles;
}

/** Framed signature block for one signer (Section 320). */
export function signatureBlockHtml(signature: ContractPartySignature | undefined, title: string, lang = 'fr'): string {
  const T = LANG(lang);
  const image = signature?.imageDataUrl ? `<img src="${signature.imageDataUrl}" alt="${T.signatures}" style="max-width:260px;max-height:70px;object-fit:contain;display:block;margin:0 auto 6px">` : `<div style="height:56px;border-bottom:1px dashed #94a3b8;margin-bottom:6px"></div>`;
  return `<div class="contract-signature-block" style="border:1.5px solid #64748b;border-radius:8px;padding:10px 12px;min-width:260px;background:#ffffff">
    <b style="display:block;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">${title}</b>
    ${image}
    <div style="text-align:center;font-size:11px"><b>${signature?.name || '—'}</b></div>
    <div style="text-align:center;font-size:10px;color:#475569">${signature?.title || ''}${signature?.place ? ` • ${signature.place}` : ''}</div>
    <div style="text-align:center;font-size:9px;color:#64748b;font-variant-numeric:tabular-nums">${signedDateTime(signature?.signedAt, lang)}</div>
  </div>`;
}

/** Full employment-contract document: header/footer, parties, articles, signatures (318–320). */
export function renderContractDocument(context: ContractDocumentContext): string {
  const { contract, company } = context;
  const lang = context.lang || 'fr';
  const T = LANG(lang);
  const companyName = company.companyName || company.legalName || 'SARI SYSTÈME';
  const employeeName = [context.employee.firstName, context.employee.lastName].filter(Boolean).join(' ') || '—';
  const logo = company.documentLogo ? `<img src="${company.documentLogo}" style="max-width:150px;max-height:60px;object-fit:contain">` : `<b style="font-size:16px;color:#009CC5">SARI SYSTÈME</b>`;
  const articles = contractArticles(context).map((article) => `<div class="contract-article" style="margin:10px 0;page-break-inside:avoid"><p style="margin:0 0 4px"><b>${lang === 'ar' ? `المادة ${article.n}` : lang === 'en' ? `Article ${article.n}` : `Article ${article.n}`} — ${article.title}</b></p><div style="font-size:12px;line-height:1.55;text-align:justify">${article.body}</div></div>`).join('');
  const employeeSig = contract.signatures?.employee;
  const companySig = contract.signatures?.company;
  const legacy = contract.signature;
  const employeeBlock = employeeSig || (legacy ? { name: legacy.name, signedAt: legacy.signedAt, title: T.employeeSign } : undefined);
  const blocks = `<div style="display:flex;flex-wrap:wrap;gap:18px;justify-content:space-between;margin-top:18px">${signatureBlockHtml(companySig, `${T.forCompany} — ${companyName}`, lang)}${signatureBlockHtml(employeeBlock, `${T.employeeSign} — ${employeeName}`, lang)}</div>`;
  return `<style>.contract-page-footer{position:fixed;bottom:0;left:0;right:0;display:none}@media print{.contract-page-footer{display:flex;justify-content:space-between;border-top:1px solid #cbd5e1;padding-top:4px;font-size:9px;color:#475569}.contract-page-counter::after{content:counter(page) ' / ' counter(pages)}}body{counter-reset:page 0}</style>
<div class="contract-document" style="font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#0f172a;font-size:12px">
  <header class="contract-doc-header" style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #009CC5;padding-bottom:10px;margin-bottom:14px">
    <div>${logo}<div style="font-size:10px;color:#475569">${companyName} — ${company.address || 'Algérie'}</div></div>
    <div style="text-align:right;font-size:10px;color:#475569"><b>${company.rc || '—'}</b><br>${T.nif} ${company.nif || '—'} • ${T.nai} ${company.nai || company.ai || '—'} • ${T.nis} ${company.nis || '—'}</div>
  </header>
  <div style="text-align:center;margin:10px 0 16px"><h1 style="margin:0;font-size:20px;letter-spacing:.12em;color:#007d9e">${T.contractOf} — ${contract.type || ''}</h1>
  <p style="margin:4px 0 0;font-size:11px">${T.reference} ${contract.referenceCode || contract.id || ''} • ${T.establishedOn} ${contract.startDate || ''}</p></div>
  ${articles}
  ${blocks}
  <footer class="contract-doc-footer" style="display:flex;justify-content:space-between;border-top:1px solid #cbd5e1;padding-top:6px;margin-top:16px;font-size:9px;color:#475569">
    <span>${companyName} — ${company.address || 'Algérie'}</span>
    <span><b>${contract.referenceCode || contract.id || ''}</b></span>
    <span class="contract-page-counter">${T.page}</span>
  </footer>
</div>`;
}

/** Work certificate body by type (Section 321): with/without salary, with tasks. */
export function renderWorkCertificate(context: { certificate: CertificateLike; employee: EmployeeLike; company: CompanyLike; jobTasks?: JobFunctions | null; lang?: string }): string {
  const { certificate, employee, company, jobTasks } = context;
  const lang = context.lang || 'fr';
  const T = LANG(lang);
  const companyName = company.companyName || company.legalName || 'SARI SYSTÈME';
  const employeeName = [employee.firstName, employee.lastName].filter(Boolean).join(' ') || certificate.employeeName || '—';
  const includeSalary = certificate.includeSalary !== false && certificate.typeId !== 'withoutSalary';
  const includeTasks = certificate.includeTasks || certificate.typeId === 'withTasks';
  const tasksHtml = includeTasks ? `<h3 style="font-size:13px;margin:16px 0 4px">${T.functions}</h3><div style="font-size:12px;line-height:1.55;text-align:justify">${pick(jobTasks?.tasks, lang) || '—'}</div>` : '';
  const salaryLine = includeSalary ? ` ${T.monthlySalary} <b>${(certificate.salary || 0).toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')} DA</b>.` : '.';
  const logo = company.documentLogo ? `<img src="${company.documentLogo}" style="max-width:130px;max-height:50px;object-fit:contain">` : `<b style="font-size:15px;color:#009CC5">SARI SYSTÈME</b>`;
  const managerSig = certificate.signatures?.manager;
  return `<div class="certificate-document" style="font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#0f172a;font-size:12px">
  <header style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #009CC5;padding-bottom:10px;margin-bottom:18px">
    <div>${logo}<div style="font-size:10px;color:#475569">${companyName} — ${company.address || 'Algérie'}</div></div>
    <div style="text-align:right;font-size:10px;color:#475569"><b>${company.rc || '—'}</b><br>${T.nif} ${company.nif || '—'} • ${T.nai} ${company.nai || company.ai || '—'} • ${T.nis} ${company.nis || '—'}</div>
  </header>
  <h1 style="text-align:center;font-size:18px;letter-spacing:.14em;color:#007d9e;margin:8px 0 4px">${T.attested}</h1>
  <p style="text-align:center;font-size:11px;margin:0 0 16px">${T.reference} ${certificate.referenceCode || certificate.id || ''} — ${T.doneAt} ${company.address || '—'}, ${T.the} ${certificate.issueDate || new Date().toISOString().slice(0, 10)}</p>
  <div style="line-height:1.7;text-align:justify">
    <p style="margin:0">${T.attestBody} <b>${companyName}</b>, ${T.registered} ${company.rc || '—'}, ${T.certify}</p>
    <p style="margin:8px 0 0"><b>${employeeName}</b>, ${T.bornOn} ${employee.dateOfBirth || '—'}, ${T.employedAs} <b>${certificate.hireDate || employee.hireDate || '—'}</b> ${T.asPosition} <b>${certificate.position || employee.position || '—'}</b>.</p>
    <p style="margin:8px 0 0">${T.currentPosition} « ${certificate.position || employee.position || '—'} » ${T.hours ? '' : ''}${T.hours} : ${40} h${salaryLine}</p>
    ${tasksHtml}
    <p style="margin:16px 0 0">${T.stillEmployed}</p>
  </div>
  <div style="display:flex;justify-content:flex-end;margin-top:28px">${signatureBlockHtml(managerSig, `${T.forManager}`, lang)}</div>
  <footer style="display:flex;justify-content:space-between;border-top:1px solid #cbd5e1;padding-top:6px;margin-top:18px;font-size:9px;color:#475569">
    <span>${companyName} — ${company.address || 'Algérie'}</span>
    <span><b>${certificate.referenceCode || certificate.id || ''}</b></span>
  </footer>
</div>`;
}

export const contractsEngine = { contractArticles, renderContractDocument, renderWorkCertificate, signatureBlockHtml, signedDateTime, LANG };
