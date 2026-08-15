/** Lightweight dependency-free rich text editor compatible with offline PWA mode. */
const RichTextEditor = {
  selections: new Map(),
  html(id, value = '', label = 'Description détaillée') {
    return `<div class="rich-editor-wrap"><label class="doc-label">${label}</label><div class="rich-editor-toolbar" role="toolbar" aria-label="Mise en forme"><button type="button" onmousedown="RichTextEditor.rememberSelection('${id}')" onclick="RichTextEditor.command('${id}','bold')" title="Gras"><b>B</b></button><button type="button" onmousedown="RichTextEditor.rememberSelection('${id}')" onclick="RichTextEditor.command('${id}','italic')" title="Italique"><i>I</i></button><button type="button" onmousedown="RichTextEditor.rememberSelection('${id}')" onclick="RichTextEditor.command('${id}','underline')" title="Souligné"><u>U</u></button><label class="rich-color-control" title="Couleur du texte"><span>A</span><input type="color" value="#0f172a" onmousedown="RichTextEditor.rememberSelection('${id}')" oninput="RichTextEditor.applyColor('${id}','foreColor',this.value)"></label><label class="rich-color-control rich-highlight-control" title="Couleur de surlignage"><span>A</span><input type="color" value="#fff59d" onmousedown="RichTextEditor.rememberSelection('${id}')" oninput="RichTextEditor.applyColor('${id}','hiliteColor',this.value)"></label><button type="button" onmousedown="RichTextEditor.rememberSelection('${id}')" onclick="RichTextEditor.command('${id}','insertUnorderedList')">• Liste</button><button type="button" onmousedown="RichTextEditor.rememberSelection('${id}')" onclick="RichTextEditor.command('${id}','formatBlock','h3')">Titre</button><button type="button" onmousedown="RichTextEditor.rememberSelection('${id}')" onclick="RichTextEditor.createLink('${id}')">Lien</button></div><div id="${id}" class="rich-editor" contenteditable="true" role="textbox" aria-multiline="true" onmouseup="RichTextEditor.rememberSelection('${id}')" onkeyup="RichTextEditor.rememberSelection('${id}')">${this.sanitize(value)}</div></div>`;
  },
  rememberSelection(id) {
    const editor=document.getElementById(id),selection=window.getSelection();
    if(!editor||!selection?.rangeCount)return;
    const range=selection.getRangeAt(0);
    if(editor.contains(range.commonAncestorContainer))this.selections.set(id,range.cloneRange());
  },
  restoreSelection(id) {
    const range=this.selections.get(id),selection=window.getSelection();
    if(!range||!selection)return;
    selection.removeAllRanges();selection.addRange(range);
  },
  async createLink(id){this.rememberSelection(id);const v=await DialogManager.form('Insérer un lien',[{name:'url',label:'Adresse URL',type:'url',required:true}]);if(v)this.command(id,'createLink',v.url);},
  command(id, command, value = null) { const el=document.getElementById(id);if(!el)return false;el.focus();this.restoreSelection(id);const applied=document.execCommand(command,false,value);this.rememberSelection(id);return applied;},
  applyColor(id,command,value){this.restoreSelection(id);const applied=this.command(id,command,value);if(command==='hiliteColor'&&!applied)this.command(id,'backColor',value);},
  value(id) { return this.sanitize(document.getElementById(id)?.innerHTML || ''); },
  sanitize(html='') { const template=document.createElement('template');template.innerHTML=String(html);template.content.querySelectorAll('script,style,iframe,object,embed').forEach(el=>el.remove());template.content.querySelectorAll('*').forEach(el=>[...el.attributes].forEach(a=>{if(a.name.startsWith('on')||/javascript:/i.test(a.value))el.removeAttribute(a.name);}));return template.innerHTML; }
};
window.RichTextEditor=RichTextEditor;

export {};
