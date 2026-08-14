/** ERP-wide configurable reference and sequence generator. */
const ReferenceCodeManager = {
  pad(value, digits = 5) { return String(value).padStart(Number(digits) || 5, '0'); },
  periodFor(def, date) { const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); return def.resetFrequency==='monthly'?`${y}-${m}`:def.resetFrequency==='yearly'?String(y):'all'; },
  async getDefinition(code) { return sariDB.getById('documentCodes', code); },
  render(def, sequence, context = {}) {
    const date = new Date(context.date || Date.now()); const yy=String(date.getFullYear()).slice(-2); const yyyy=String(date.getFullYear()); const mm=String(date.getMonth()+1).padStart(2,'0');
    const subtype=String(context.subType || def.subTypeOptions?.[0]?.code || '01').padStart(2,'0').slice(-2);
    const country=String(context.country || 'DZA').replace(/[^a-z]/gi,'').toUpperCase().padEnd(3,'X').slice(0,3);
    const template=String(context.templateType || 'FAC').replace(/[^a-z]/gi,'').toUpperCase().padEnd(3,'X').slice(0,3);
    const registry=this.pad(context.registry || sequence, 2);
    return String(def.mask || '{PREFIX}{YY}-{SEQ}')
      .replaceAll('{PREFIX}',def.code).replaceAll('{YY}',yy).replaceAll('{YYYY}',yyyy).replaceAll('{MM}',mm)
      .replaceAll('{SEQ}',this.pad(sequence,def.sequenceMinDigits)).replaceAll('{SUBTYPE}',subtype)
      .replaceAll('{COUNTRY3}',country).replaceAll('{TEMPLATE3}',template).replaceAll('{REGISTRY}',registry);
  },
  async preview(code, context = {}) {
    const def=await this.getDefinition(code); if(!def)return `${code}-${Date.now()}`;
    const key=`${code}:${this.periodFor(def,new Date(context.date||Date.now()))}:${context.subType||''}:${context.country||''}:${context.templateType||''}`;
    const counter=await sariDB.getById('sequenceCounters',key); return this.render(def,(counter?.value||0)+1,context);
  },
  async forRecord(code, numericId, context = {}) { const def=await this.getDefinition(code);return def?this.render(def,Number(numericId),{...context,recordId:Number(numericId)}):`${code}-${numericId}`; },
  async generate(code, context = {}) {
    const def=await this.getDefinition(code); if(!def)return `${code}-${Date.now()}`;
    if(context.recordId)return this.render(def,Number(context.recordId),context);
    // Draft-only preview. The persistence layer always rebuilds the final reference from numericId.
    const key=`${code}:preview:${context.subType||''}:${context.country||''}:${context.templateType||''}`,counter=await sariDB.getById('sequenceCounters',key)||{id:key,code,value:0};counter.value++;await sariDB.save('sequenceCounters',counter);return this.render(def,counter.value,context);
  }
};
window.ReferenceCodeManager=ReferenceCodeManager;
