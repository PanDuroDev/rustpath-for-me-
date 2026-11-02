(() => {
"use strict";
const $=id=>document.getElementById(id), root=document.documentElement, STORE="rustpath-lesson-04-v1";
const ui={
ar:{dashboard:"لوحة التعلّم",progress:"سجل التقدم",back:"العودة إلى لوحة التعلّم",active:"الدرس الحالي",lessonKicker:"مساحة التعلّم · الدرس 04",lessonProgress:"الشرح والتطبيق والاختبار",beforeStart:"قبل أن تبدأ",objectivesTitle:"ما الذي ستتعلمه؟",learnPart:"الجزء الأول",explanationTitle:"افهم الفكرة أولاً",readAtOwnPace:"تقدم حسب سرعتك",loadingLesson:"جارٍ تحميل الشرح…",practicePart:"الجزء الثاني · التطبيق",labTitle:"جرّب بنفسك",simulationOnly:"محاكاة آمنة",resetTerminal:"إعادة ضبط الطرفية",runCommand:"تنفيذ",terminalNote:"الأوامر مدعومة داخل المحاكاة فقط. لا يوجد وصول إلى ملفات Windows أو PowerShell الحقيقي.",checkPart:"الجزء الثالث · إثبات الفهم",quizTitle:"اختبر فهمك",quizIntro:"أجب عن الأسئلة الخمسة. افتح التلميح عند الحاجة؛ تظهر الملاحظات بعد إرسال الإجابات.",submitAnswers:"تحقق من الإجابات",finishPart:"نهاية الدرس",finishTitle:"هل أتقنت المهارة؟",finishDescription:"أكمل المهمة العملية واحصل على 5 من 5 حتى تُسجّل المحاولة مكتملة على هذا المتصفح.",notFinished:"لم تكتمل المحاولة بعد.",exportReport:"تنزيل تقرير المحاولة",localOnly:"الحفظ محلي على هذا المتصفح فقط",quizCount:"أسئلة",answerAll:"أجب عن جميع الأسئلة أولاً.",score:"نتيجتك",outOf:"من",passedQuiz:"اجتزت الاختبار. بقي إكمال المهمة العملية.",passedLab:"اكتملت المهمة العملية. بقي اجتياز الاختبار بنتيجة 5 من 5.",passed:"أكملت الدرس في هذه المحاولة المحلية.",noLocalWrite:"هذا لا يغيّر سجل GitHub الرسمي؛ التقرير دليل محلي يمكن مراجعته قبل تحديث السجل.",correct:"هذا الاختيار صحيح.",wrong:"هذا الاختيار غير صحيح. التصحيح:",terminalWelcome:"محاكاة PowerShell تعليمية. اكتب help لمعرفة الأوامر المدعومة.",placeholder:"اكتب أمراً مثل Get-Location ثم اضغط Enter",empty:"اكتب أمراً أولاً.",unknown:"الأمر غير مدعوم. اكتب help لعرض الأوامر المتاحة.",missing:"المجلد غير موجود في هذا الموقع.",exists:"يوجد عنصر بهذا الاسم بالفعل.",invalid:"اسم غير صالح. استخدم اسماً واحداً دون مسارات.",notDir:"العنصر المحدد ليس مجلداً.",atRoot:"أنت بالفعل في مجلد البداية.",madeDir:"تم إنشاء المجلد:",madeFile:"تم إنشاء الملف:",emptyDir:"هذا المجلد فارغ.",resetAsk:"هل تريد إعادة ضبط نظام الملفات التجريبي؟",resetDone:"أُعيد ضبط الطرفية. بيانات الاختبار لم تتغير.",downloadError:"تعذر إنشاء ملف التقرير."},
en:{dashboard:"Dashboard",progress:"Progress log",back:"Back to learning dashboard",active:"Current lesson",lessonKicker:"Learning space · Lesson 04",lessonProgress:"Explanation, practice, and quiz",beforeStart:"Before you start",objectivesTitle:"What will you learn?",learnPart:"Part one",explanationTitle:"Understand the idea first",readAtOwnPace:"Move at your own pace",loadingLesson:"Loading lesson…",practicePart:"Part two · Practice",labTitle:"Try it yourself",simulationOnly:"Safe simulation",resetTerminal:"Reset terminal",runCommand:"Run",terminalNote:"Commands run only in this simulation. It cannot access Windows files or your real PowerShell.",checkPart:"Part three · Demonstrate understanding",quizTitle:"Check your understanding",quizIntro:"Answer all five questions. Open a hint when needed; feedback appears after submitting.",submitAnswers:"Check answers",finishPart:"Lesson finish",finishTitle:"Have you mastered the skill?",finishDescription:"Complete the practical challenge and score 5 out of 5 to complete this attempt in this browser.",notFinished:"This attempt is not complete yet.",exportReport:"Download attempt report",localOnly:"Saved locally in this browser only",quizCount:"questions",answerAll:"Answer every question first.",score:"Your score",outOf:"out of",passedQuiz:"Quiz passed. Complete the practical challenge next.",passedLab:"Practical challenge complete. The quiz still needs 5 out of 5.",passed:"You completed this lesson attempt locally.",noLocalWrite:"This does not change the official GitHub record; the report is local evidence for review.",correct:"This choice is correct.",wrong:"This choice is incorrect. Correction:",terminalWelcome:"PowerShell learning simulation. Type help to see supported commands.",placeholder:"Type a command such as Get-Location and press Enter",empty:"Type a command first.",unknown:"Command not supported. Type help to see available commands.",missing:"The directory does not exist here.",exists:"An item with this name already exists.",invalid:"Invalid name. Use one name without path separators.",notDir:"The selected item is not a directory.",atRoot:"You are already at the starting directory.",madeDir:"Created directory:",madeFile:"Created file:",emptyDir:"This directory is empty.",resetAsk:"Reset the simulated file system?",resetDone:"The terminal was reset. Quiz answers were kept.",downloadError:"This browser could not create the report file."}
};
let lang="ar", lesson=null, state=null;
const t=k=>ui[lang][k]||k, tr=x=>x?.[lang]||x?.ar||x?.en||"", make=(tag,cls="",value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;};
const base=()=>lesson.simulator.initialPath, full=path=>base()+(path.length?"\\"+path.join("\\"):"");
const dir=name=>({type:"directory",name,children:{}}), valid=name=>Boolean(name)&&!/[\\/:*?"<>|]/.test(name)&&name!=="."&&name!=="..";
const split=cmd=>cmd.match(/"[^"]*"|'[^']*'|[^\s]+/g)?.map(x=>x.replace(/^(["'])(.*)\1$/,"$2"))||[];
function initial(){const fs=dir("Learner");lesson.simulator.initialDirectories.forEach(x=>fs.children[x]=dir(x));return{version:1,fs,currentPath:[],history:[],lastListedPath:null,answers:{},quiz:null,passed:false};}
function get(path=state.currentPath){let n=state.fs;for(const part of path){if(!n.children?.[part])return null;n=n.children[part];}return n;}
function challengeDone(){const f=state.fs.children.RustPractice;return Boolean(f?.type==="directory"&&f.children["notes.txt"]?.type==="file"&&state.currentPath.join("\\")==="RustPractice"&&state.lastListedPath==="RustPractice");}
function updateBar(){if(!lesson||!state)return;const count=(challengeDone()?1:0)+(state.quiz?.score===lesson.quiz.length?1:0)+(state.passed?1:0);$("lesson-progress-value").textContent=count+" / 3";$("lesson-progress-fill").style.width=count/3*100+"%";$("export-report").disabled=!state.passed;}
function save(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch(_){}updateBar();}
function updateCompletion(){const lab=challengeDone(),quiz=state.quiz?.score===lesson.quiz.length;state.passed=lab&&quiz;$("finish-status").textContent=state.passed?t("passed")+" "+t("noLocalWrite"):quiz?t("passedQuiz"):lab?t("passedLab"):t("notFinished");updateBar();}
function runCommand(raw){
const command=raw.trim(),args=split(command),verb=(args[0]||"").toLowerCase(),here=get();
if(!command)return{output:t("empty"),error:true};
if(["help","get-help"].includes(verb))return{output:tr(lesson.simulator.help)};
if(["clear","cls","clear-host"].includes(verb))return{clear:true};
if(["get-location","pwd"].includes(verb))return{output:full(state.currentPath)};
if(["get-childitem","gci","dir","ls"].includes(verb)){state.lastListedPath=state.currentPath.join("\\");const items=Object.values(here.children||{});return{output:items.length?items.map(x=>(x.type==="directory"?"<DIR> ":"      ")+x.name).join("\n"):t("emptyDir")};}
if(["cd","set-location"].includes(verb)){
 const dest=args.slice(1).join(" ");if(!dest||dest===".")return{output:full(state.currentPath)};
 let path;
 if(dest===".."){if(!state.currentPath.length)return{output:t("atRoot")};path=state.currentPath.slice(0,-1);}
 else if(/^[A-Za-z]:/.test(dest)){const b=base().toLowerCase(),d=dest.toLowerCase();if(d===b)path=[];else if(d.startsWith(b+"\\"))path=dest.slice(base().length+1).split(/[\\/]/).filter(Boolean);else return{output:t("missing"),error:true};}
 else path=[...state.currentPath,...dest.split(/[\\/]/).filter(Boolean)];
 const target=get(path);if(!target)return{output:t("missing"),error:true};if(target.type!=="directory")return{output:t("notDir"),error:true};
 state.currentPath=path;state.lastListedPath=null;return{output:full(path)};
}
if(verb==="mkdir"){
 const name=args.slice(1).join(" ");if(!valid(name))return{output:t("invalid"),error:true};if(here.children[name])return{output:t("exists"),error:true};
 here.children[name]=dir(name);state.lastListedPath=null;return{output:t("madeDir")+" "+name};
}
if(verb==="new-item"||verb==="ni"){
 const typ=command.match(/-ItemType\s+(Directory|File)/i),named=command.match(/-Name\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))/i);
 const kind=typ?.[1].toLowerCase()||"",name=named?(named[1]||named[2]||named[3]):"";
 if(!["file","directory"].includes(kind)||!valid(name))return{output:t("unknown"),error:true};
 if(here.children[name])return{output:t("exists"),error:true};
 here.children[name]=kind==="directory"?dir(name):{type:"file",name};state.lastListedPath=null;
 return{output:(kind==="directory"?t("madeDir"):t("madeFile"))+" "+name};
}
return{output:t("unknown"),error:true};
}
function renderTerminal(){
renderChallenge();
const host=$("terminal-history");host.replaceChildren();
state.history.forEach(item=>{const row=make("div","terminal-entry"),cmd=make("div","terminal-command",item.command);cmd.dataset.path=item.path;row.append(cmd);if(item.output)row.append(make("pre","terminal-output"+(item.error?" terminal-error":""),item.output));host.append(row);});
host.scrollTop=host.scrollHeight;$("terminal-welcome").textContent=t("terminalWelcome");
const s=$("challenge-status");s.textContent=challengeDone()?tr(lesson.simulator.completed):tr(lesson.simulator.incomplete);s.dataset.state=challengeDone()?"complete":"pending";
}
function sendCommand(raw){const result=runCommand(raw);if(result.clear)state.history=[];else state.history.push({command:raw,output:result.output||"",error:Boolean(result.error),path:state.currentPath.join("\\")||"."});renderTerminal();updateCompletion();save();$("terminal-input").focus();}
function renderObjectives(){const host=$("objectives-list");host.replaceChildren();lesson.objectives.forEach(x=>host.append(make("li","",tr(x))));}
function renderSections(){
const host=$("lesson-sections");host.replaceChildren();lesson.sections.forEach(section=>{const card=make("article","lesson-card");card.append(make("h3","",tr(section.title)));section.paragraphs.forEach(p=>card.append(make("p","",tr(p))));
if(section.bullets?.length){const ul=make("ul");section.bullets.forEach(x=>ul.append(make("li","",tr(x))));card.append(ul);}
const ex=make("div","lesson-example");ex.append(make("span","lesson-example-label",lang==="ar"?"مثال":"Example"));const pre=make("pre"),code=make("code","",section.example.command);pre.append(code);ex.append(pre,make("p","",tr(section.example.explanation)));card.append(ex);host.append(card);});
}
function challengeStepsDone(){
const folder=state.fs.children.RustPractice;
return[
state.history.some(entry=>/^(get-location|pwd)$/i.test(entry.command.trim().split(/\\s+/)[0])),
Boolean(folder&&folder.type==="directory"),
state.currentPath.join("\\")==="RustPractice",
Boolean(folder?.children["notes.txt"]?.type==="file"),
challengeDone()
];
}
function renderChallenge(){
const host=$("challenge-steps");host.replaceChildren();
const done=challengeStepsDone();
lesson.challengeSteps.forEach((step,index)=>{const item=make("li",done[index]?"is-complete":"",tr(step));item.dataset.completed=String(done[index]);host.append(item);});
$("challenge-title").textContent=tr(lesson.simulator.challengeTitle);$("challenge-text").textContent=tr(lesson.simulator.challengeText);$("simulator-title").textContent=tr(lesson.simulator.title);$("simulator-description").textContent=tr(lesson.simulator.description);$("terminal-input").placeholder=t("placeholder");
}
function renderQuiz(){
const host=$("quiz-questions");host.replaceChildren();lesson.quiz.forEach((q,i)=>{const fs=make("fieldset","quiz-question");fs.append(make("legend","",(i+1)+". "+tr(q.prompt)));const choices=make("div","quiz-options");
q.options.forEach(option=>{const label=make("label","quiz-option"),input=document.createElement("input");input.type="radio";input.name=q.id;input.value=option.id;input.checked=state.answers[q.id]===option.id;input.addEventListener("change",()=>{state.answers[q.id]=option.id;state.quiz=null;state.passed=false;$("quiz-feedback").hidden=true;$("quiz-feedback").replaceChildren();document.querySelectorAll(".quiz-feedback-item").forEach(item=>item.remove());$("quiz-progress").textContent=Object.keys(state.answers).length+" / "+lesson.quiz.length;$("finish-status").textContent=t("notFinished");save();});label.append(input,make("span","",tr(option.text)));choices.append(label);});
const hint=make("details","quiz-hint");hint.append(make("summary","",lang==="ar"?"تلميح":"Hint"),make("p","",tr(q.hint)));fs.append(choices,hint);
if(state.quiz){const ok=state.quiz.answers[q.id]===q.answer;const feedback=make("p","quiz-feedback-item",(ok?t("correct"):t("wrong"))+" "+tr(q.feedback));feedback.dataset.correct=String(ok);fs.append(feedback);}
host.append(fs);});
$("quiz-count").textContent="5 "+t("quizCount");$("quiz-progress").textContent=Object.keys(state.answers).length+" / 5";
if(state.quiz){const box=$("quiz-feedback");box.hidden=false;box.replaceChildren(make("strong","",t("score")+": "+state.quiz.score+" "+t("outOf")+" 5"),make("p","",state.quiz.score===5?t("passedQuiz"):t("notFinished")));}
}
function submitQuiz(event){event.preventDefault();if(lesson.quiz.some(q=>!state.answers[q.id])){$("quiz-feedback").hidden=false;$("quiz-feedback").textContent=t("answerAll");return;}
let score=0;lesson.quiz.forEach(q=>{if(state.answers[q.id]===q.answer)score++;});state.quiz={score,answers:{...state.answers},checkedAt:new Date().toISOString()};renderQuiz();updateCompletion();save();}
function applyLanguage(next,persist=false){
lang=next==="en"?"en":"ar";root.lang=lang;root.dir=lang==="en"?"ltr":"rtl";document.querySelectorAll("[data-i18n]").forEach(n=>{const k=n.dataset.i18n;if(ui[lang][k])n.textContent=ui[lang][k];});
$("language-toggle").textContent=lang==="ar"?"English":"العربية";$("theme-toggle").textContent=root.dataset.theme==="light"?(lang==="ar"?"الوضع الداكن":"Dark mode"):(lang==="ar"?"الوضع الفاتح":"Light mode");
if(lesson&&state){$("lesson-title").textContent=tr(lesson.title);$("lesson-intro").textContent=tr(lesson.intro);renderObjectives();renderSections();renderChallenge();renderQuiz();renderTerminal();updateCompletion();}
if(persist)try{localStorage.setItem("rustpath-language",lang);}catch(_){}
}
function applyTheme(next,persist=false){root.dataset.theme=next==="light"?"light":"dark";const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=root.dataset.theme==="light"?"#fff":"#090909";$("theme-toggle").textContent=root.dataset.theme==="light"?(lang==="ar"?"الوضع الداكن":"Dark mode"):(lang==="ar"?"الوضع الفاتح":"Light mode");if(persist)try{localStorage.setItem("rustpath-theme",root.dataset.theme);}catch(_){}}
function restore(){try{const saved=JSON.parse(localStorage.getItem(STORE)||"null");state=saved?.version===1&&saved.fs&&Array.isArray(saved.currentPath)?{...initial(),...saved,answers:saved.answers||{},history:Array.isArray(saved.history)?saved.history:[]}:initial();}catch(_){state=initial();}}
function report(){return{reportVersion:1,project:"RustPath",lessonId:4,lessonSlug:"terminal-and-paths",status:state.passed?"locally-completed":"incomplete",quiz:state.quiz,challenge:{completed:challengeDone(),currentPath:full(state.currentPath),listedPath:state.lastListedPath,commands:state.history},exportedAt:new Date().toISOString(),note:"Local browser evidence only; this does not update the official GitHub progress record."};}
function downloadReport(){try{const url=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],{type:"application/json"})),a=make("a");a.href=url;a.download="rustpath-lesson-04-attempt.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$("finish-status").textContent=t("passed")+" "+t("noLocalWrite");}catch(_){$("finish-status").textContent=t("downloadError");}}
function bind(){
$("language-toggle").addEventListener("click",()=>applyLanguage(lang==="ar"?"en":"ar",true));
$("theme-toggle").addEventListener("click",()=>applyTheme(root.dataset.theme==="light"?"dark":"light",true));
$("terminal-form").addEventListener("submit",e=>{e.preventDefault();const input=$("terminal-input");sendCommand(input.value);input.value="";});
$("terminal-reset").addEventListener("click",()=>{if(!window.confirm(t("resetAsk")))return;const fresh=initial();state.fs=fresh.fs;state.currentPath=[];state.history=[];state.lastListedPath=null;renderTerminal();updateCompletion();save();$("finish-status").textContent=t("resetDone");});
$("quiz-form").addEventListener("submit",submitQuiz);$("export-report").addEventListener("click",downloadReport);
}
async function start(){
try{
const urls=["./lessons/lesson-04-terminal-and-paths.json?v=20261102-2","https://raw.githubusercontent.com/PanDuroDev/rustpath-for-me-/main/lessons/lesson-04-terminal-and-paths.json"];
const requested=new URLSearchParams(window.location.search).get("lesson");
if(requested&&requested!=="4")throw Error("This lesson is not available in the current learning stage.");
let errors=[];for(const url of urls){try{const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);lesson=await r.json();break;}catch(e){errors.push(e.message||String(e));}}
if(!lesson)throw Error(errors.join(" | "));if(lesson.id!==4||lesson.quiz?.length!==5)throw Error("Invalid lesson data.");
restore();$("lesson-title").textContent=tr(lesson.title);$("lesson-intro").textContent=tr(lesson.intro);renderObjectives();renderSections();renderChallenge();renderQuiz();renderTerminal();
const saved=(()=>{try{return localStorage.getItem("rustpath-language");}catch(_){return null;}})();applyLanguage(saved==="en"?"en":"ar");updateCompletion();save();
}catch(error){console.error("RustPath lesson failed to load:",error);$("lesson-error").hidden=false;$("lesson-error").append(document.createTextNode(" "+error.message));$("lesson-title").textContent=lang==="ar"?"تعذر تحميل الدرس":"Lesson could not be loaded";}
}
try{const th=localStorage.getItem("rustpath-theme"),la=localStorage.getItem("rustpath-language");if(th==="light"||th==="dark")root.dataset.theme=th;if(la==="en"||la==="ar")lang=la;}catch(_){}
root.lang=lang;root.dir=lang==="en"?"ltr":"rtl";bind();start();
})();