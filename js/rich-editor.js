/** Lightweight dependency-free rich text editor compatible with offline PWA mode. */
const RichTextEditor = {
  html(id, value = '', label = 'Description détaillée') {
    return `<div class="rich-editor-wrap"><label class="doc-label">${label}</label><div class="rich-editor-toolbar" role="toolbar" aria-label="Mise en forme"><button type="button" onclick="RichTextEditor.command('${id}','bold')"><b>B</b></button><button type="button" onclick="RichTextEditor.command('${id}','italic')"><i>I</i></button><button type="button" onclick="RichTextEditor.command('${id}','underline')"><u>U</u></button><button type="button" onclick="RichTextEditor.command('${id}','insertUnorderedList')">• Liste</button><button type="button" onclick="RichTextEditor.command('${id}','formatBlock','h3')">Titre</button><button type="button" onclick="RichTextEditor.createLink('${id}')">Lien</button></div><div id="${id}" class="rich-editor" contenteditable="true" role="textbox" aria-multiline="true">${this.sanitize(value)}</div></div>`;
  },
  async createLink(id){const v=await DialogManager.form('Insérer un lien',[{name:'url',label:'Adresse URL',type:'url',required:true}]);if(v)this.command(id,'createLink',v.url);},
  command(id, command, value = null) { const el=document.getElementById(id); if(!el)return;el.focus();document.execCommand(command,false,value); },
  value(id) { return this.sanitize(document.getElementById(id)?.innerHTML || ''); },
  sanitize(html='') { const template=document.createElement('template');template.innerHTML=String(html);template.content.querySelectorAll('script,style,iframe,object,embed').forEach(el=>el.remove());template.content.querySelectorAll('*').forEach(el=>[...el.attributes].forEach(a=>{if(a.name.startsWith('on')||/javascript:/i.test(a.value))el.removeAttribute(a.name);}));return template.innerHTML; }
};
window.RichTextEditor=RichTextEditor;

export {};
