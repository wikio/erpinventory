'use strict';
const fs=require('fs');const path=require('path');
class SmtpService{
 constructor(root){this.file=path.join(root,'.runtime','smtp.json');this.sessionPassword='';this.config=this.load();}
 load(){try{const value=JSON.parse(fs.readFileSync(this.file,'utf8'));delete value.password;return value;}catch(_){return{host:'',port:587,username:'',password:'',security:'starttls',senderName:'SARI Système',senderAddress:'',enabled:false};}}
 public(){const{password,...safe}=this.config;return{...safe,hasPassword:Boolean(this.sessionPassword||process.env.SARI_SMTP_PASSWORD)};}
 save(input){if(input.password)this.sessionPassword=input.password;const{password,...safe}=input;this.config={...this.config,...safe,updatedAt:new Date().toISOString()};fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(this.file,JSON.stringify(this.config,null,2),{mode:0o600});return this.public();}
 async send({to,subject,text,html}){if(!this.config.enabled)throw Error('SMTP is disabled');const nodemailer=require('nodemailer'),security=this.config.security||'starttls',transport=nodemailer.createTransport({host:this.config.host,port:Number(this.config.port||587),secure:security==='ssl',requireTLS:security==='starttls',auth:this.config.username?{user:this.config.username,pass:process.env.SARI_SMTP_PASSWORD||this.sessionPassword}:undefined,tls:{rejectUnauthorized:this.config.rejectUnauthorized!==false},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});const info=await transport.sendMail({from:{name:this.config.senderName||'SARI Système',address:this.config.senderAddress||this.config.username},to,subject,text,html});return{messageId:info.messageId,accepted:info.accepted};}
 async test(){return this.send({to:this.config.senderAddress||this.config.username,subject:'Test SMTP SARI Système',text:'Configuration SMTP validée.'});}
}
module.exports={SmtpService};
