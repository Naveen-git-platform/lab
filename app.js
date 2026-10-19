(() => {
  'use strict';
  const STORE = 'workpulse.entries.v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value = '') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const localDate = (date = new Date()) => { const d = new Date(date); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
  const parseDate = value => value ? new Date(value + 'T12:00:00') : null;
  const fmtDate = value => { const d = parseDate(value); return d ? d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) : 'No date'; };
  const fullDate = value => { const d=parseDate(value); return d ? d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}) : ''; };
  const today = localDate();
  const weekStart = (value=today) => { const d=parseDate(value); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); return localDate(d); };
  const addDays = (value, n) => { const d=parseDate(value); d.setDate(d.getDate()+n); return localDate(d); };
  const wordCount = text => (String(text).trim().match(/\S+/g)||[]).length;
  const typeNames = {task:'Task',followup:'Follow-up',note:'Note'};
  let entries = [];
  let view = 'overview';
  let activeDate = today;
  let listFilter = 'all';
  let searchTerm = '';
  let timesheetStart = weekStart();
  let recognition = null;
  let toastTimer;

  function seedEntries() {
    const y = addDays(today,-1);
    const demo = [
      {title:'Review API response and test error handling',type:'task',project:'CloudOps AI',date:today,minutes:45,completed:false,due:today},
      {title:'Follow up with the team about deployment approval',type:'followup',project:'CloudOps AI',date:today,minutes:10,completed:false,due:addDays(today,1)},
      {title:'Updated documentation and added test cases',type:'note',project:'WorkPulse',date:today,minutes:35,completed:true,due:''},
      {title:'Prepare weekly timesheet summary',type:'task',project:'Operations',date:y,minutes:25,completed:false,due:today}
    ];
    return demo.map((entry,i)=>({...entry,id:crypto.randomUUID?crypto.randomUUID():'demo-'+i,createdAt:new Date(Date.now()-(3-i)*3600000).toISOString(),demo:true}));
  }
  function load() {
    try {
      const saved = localStorage.getItem(STORE);
      entries = saved === null ? seedEntries() : JSON.parse(saved);
      if (!Array.isArray(entries)) entries = [];
    } catch { entries = seedEntries(); toast('Saved data could not be read. A fresh workspace was opened.','error'); }
  }
  function persist() {
    try { localStorage.setItem(STORE,JSON.stringify(entries)); $('#storage-status').textContent='Saved on this device · Just now'; }
    catch { toast('Browser storage is full. Download a backup and remove old entries.','error'); $('#storage-status').textContent='Unable to save · Export a backup'; }
    renderCounts();
  }
  function toast(message,kind='') {
    const region=$('#toast-region'), node=document.createElement('div');
    node.className='toast '+kind; node.textContent=message; region.appendChild(node);
    setTimeout(()=>node.remove(),3400);
  }
  function id() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2); }
  function dateLabel(value) { if(value===today)return 'Today'; if(value===addDays(today,-1))return 'Yesterday'; return fmtDate(value); }
  function isOverdue(entry) { return !entry.completed && entry.due && entry.due < today; }
  function isFollowup(entry) { return entry.type==='followup' && !entry.completed; }
  function sorted(list) { return [...list].sort((a,b)=>Number(a.completed)-Number(b.completed)||(a.due||a.date||'9999').localeCompare(b.due||b.date||'9999')||(b.createdAt||'').localeCompare(a.createdAt||'')); }
  function matched(list) { const q=searchTerm.trim().toLowerCase(); return sorted(list).filter(e=>!q||[e.title,e.project,e.type,e.date,e.due].join(' ').toLowerCase().includes(q)); }
  function entryTag(e) {
    if(e.completed)return '<span class="tag done">✓ Done</span>';
    if(isOverdue(e))return '<span class="tag overdue">Overdue</span>';
    if(e.type==='followup')return '<span class="tag followup">↗ Follow-up</span>';
    if(e.type==='note')return '<span class="tag note">✦ Note</span>';
    return '<span class="tag task">◻ Task</span>';
  }
  function renderCounts() {
    $('#task-count').textContent=entries.filter(e=>e.type==='task'&&!e.completed).length;
    $('#followup-count').textContent=entries.filter(isFollowup).length;
  }
  function emptyState(title,desc,cta='Capture an entry') {
    return '<div class="empty-state"><div class="empty-illustration">✦</div><h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p><button class="btn-secondary" data-action="new">'+esc(cta)+'</button></div>';
  }
  function row(e,wide=false) {
    const overdue=isOverdue(e), date=e.due ? (overdue ? 'Due '+fmtDate(e.due) : 'Due '+fmtDate(e.due)) : dateLabel(e.date);
    const project=e.project ? '<span>'+esc(e.project)+'</span><span class="meta-dot"></span>' : '';
    return '<div class="entry-row" data-id="'+esc(e.id)+'">'+
      '<button class="task-check '+(e.completed?'done':'')+'" data-action="toggle" data-id="'+esc(e.id)+'" title="'+(e.completed?'Mark open':'Mark complete')+'" aria-label="'+(e.completed?'Mark open':'Mark complete')+'">'+(e.completed?'✓':'')+'</button>'+
      '<div class="entry-main"><div class="entry-title '+(e.completed?'done':'')+'">'+esc(e.title)+'</div><div class="entry-meta">'+entryTag(e)+project+'<span>'+esc(dateLabel(e.date))+'</span>'+(e.minutes?'<span class="meta-dot"></span><span>'+e.minutes+'m</span>':'')+(overdue?'<span class="meta-dot"></span><span style="color:#c95854">Past due</span>':'')+'</div></div>'+
      '<div class="entry-end">'+(e.due?'<span class="mini-date '+(overdue?'late':'')+'">'+(overdue?'! ':'')+esc(fmtDate(e.due))+'</span>':'')+'<button class="more-btn" data-action="edit" data-id="'+esc(e.id)+'" title="Edit entry" aria-label="Edit entry">✎</button><button class="more-btn delete-btn" data-action="delete" data-id="'+esc(e.id)+'" title="Delete entry" aria-label="Delete entry">×</button></div></div>';
  }
  function panel(title,subtitle,inner,link='',cls='') {
    return '<section class="panel '+cls+'"><div class="panel-head"><div><h2 class="panel-title">'+title+'</h2>'+(subtitle?'<p class="panel-subtitle">'+subtitle+'</p>':'')+'</div>'+(link?'<button class="text-link" data-view="'+link+'">View all ↗</button>':'')+'</div>'+inner+'</section>';
  }
  function weekStrip() {
    const start=weekStart(activeDate); let cells='';
    for(let i=0;i<7;i++) {
      const d=addDays(start,i), day=parseDate(d);
      const count=entries.filter(e=>e.date===d).length;
      cells+='<button class="day-cell '+(d===activeDate?'selected ':'')+(d===today?'today':'')+'" data-action="select-day" data-date="'+d+'"><span>'+day.toLocaleDateString(undefined,{weekday:'short'}).slice(0,2)+'</span><strong>'+day.getDate()+'</strong><span class="day-mark" style="'+(count?'opacity:1':'opacity:0')+'"></span></button>';
    }
    return cells;
  }
  function renderOverview() {
    const dayEntries=matched(entries.filter(e=>e.date===activeDate));
    const pending=entries.filter(e=>!e.completed&&e.type!=='note');
    const dueToday=pending.filter(e=>e.due===today||e.date===today);
    const overdue=entries.filter(isOverdue);
    const minutesToday=entries.filter(e=>e.date===today).reduce((n,e)=>n+(Number(e.minutes)||0),0);
    const doneToday=entries.filter(e=>e.date===today&&e.completed).length;
    const workHours=(minutesToday/60).toFixed(minutesToday%60===0?0:1);
    const taskItems=dayEntries.filter(e=>e.type!=='note');
    const latest=sorted(entries).slice(0,4);
    const dueList=sorted(entries.filter(e=>!e.completed&&e.type==='followup')).slice(0,3);
    const weekEntries=entries.filter(e=>e.date>=weekStart()&&e.date<=addDays(weekStart(),6));
    const minutesWeek=weekEntries.reduce((n,e)=>n+(Number(e.minutes)||0),0);
    const logged=Math.round(minutesWeek/60*10)/10, progress=Math.min(100,Math.round(logged/40*100));
    const mainList=taskItems.length?taskItems.map(e=>row(e)).join(''):emptyState('A little space to start','Capture a task, a thought or a follow-up. Small notes make future-you happier.');
    const followList=dueList.length?'<div class="entry-list">'+dueList.map(e=>row(e)).join('')+'</div>':emptyState('Nothing waiting on someone','Follow-ups you capture will show up here.','Add a follow-up');
    return '<div class="page-heading"><div><p class="eyebrow">YOUR WORKSPACE / '+esc(today.replaceAll('-','.'))+'</p><h1>'+greeting()+', let’s make it count.</h1><p>Your work, your next steps, and the little things you don’t want to forget.</p></div><div class="heading-actions"><span class="date-pill">◷ &nbsp; '+esc(new Date().toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}))+'</span><button class="btn-primary" data-action="new">+ <span>Capture work</span></button></div></div>'+
    '<div class="stats-grid">'+
      '<div class="stat-card"><div class="stat-top">Open tasks <span class="stat-icon blue">☑</span></div><div class="stat-value">'+pending.filter(e=>e.type==='task').length+'</div><div class="stat-caption"><span class="up">'+doneToday+' completed</span> today</div></div>'+
      '<div class="stat-card"><div class="stat-top">Follow-ups <span class="stat-icon amber">↗</span></div><div class="stat-value">'+entries.filter(isFollowup).length+'</div><div class="stat-caption">'+(overdue.length?'<span style="color:#c95752">'+overdue.length+' overdue</span> to look at':'Nothing overdue — nice work')+'</div></div>'+
      '<div class="stat-card"><div class="stat-top">Time captured <span class="stat-icon green">◷</span></div><div class="stat-value">'+workHours+'<span style="font-size:13px;letter-spacing:0;color:#9ba4b1">h</span></div><div class="stat-caption">'+minutesToday+' minutes logged today</div></div>'+
      '<div class="stat-card"><div class="stat-top">This week <span class="stat-icon violet">▥</span></div><div class="stat-value">'+logged+'<span style="font-size:13px;letter-spacing:0;color:#9ba4b1">h</span></div><div class="stat-caption">'+weekEntries.length+' entries recorded</div></div></div>'+
    '<div class="layout-grid"><div class="left-stack">'+
      panel('<span>'+esc(dateLabel(activeDate))+' at a glance</span>','Pick a day to see what you captured','<div class="week-strip">'+weekStrip()+'</div><div class="week-summary"><span>Time captured this week</span><strong>'+logged+' / 40h</strong></div><div class="progress-track"><div class="progress-fill" style="width:'+progress+'%"></div></div><div class="progress-caption"><span>'+progress+'% of a 40-hour target</span><span>Weekly view</span></div>')+
      '<div style="height:15px"></div>'+
      panel('Your focus','Tasks and notes for '+esc(dateLabel(activeDate).toLowerCase()),'<div class="entry-list">'+mainList+'</div>','tasks')+
      '<div style="height:15px"></div>'+
      panel('Recently captured','A quick look at what you’ve been working on','<div class="entry-list">'+(latest.length?latest.map(e=>row(e)).join(''):emptyState('No entries yet','Start with a quick note.'))+'</div>','activity')+
      '</div><div class="right-stack">'+
      '<section class="panel focus-card"><div class="focus-top"><span class="sparkle">✦</span> A little perspective</div><h3>'+focusTitle(pending,overdue,minutesToday)+'</h3><p>'+focusBody(pending,overdue,minutesToday)+'</p><div class="focus-actions"><button data-view="followups">Review follow-ups ↗</button><button data-action="new">Quick capture +</button></div></section>'+
      panel('Don’t let it slip','Open follow-ups worth remembering',followList,'followups','quick-card')+
      '<section class="panel quick-card"><div class="panel-head"><div><h2 class="panel-title">Quick actions</h2><p class="panel-subtitle">Make the little jobs a little easier.</p></div></div><div class="quick-actions"><button class="quick-action" data-action="new-task"><span class="quick-symbol">＋</span><span><strong>Capture a task</strong><small>Get it out of your head</small></span></button><button class="quick-action" data-action="new-followup"><span class="quick-symbol">↗</span><span><strong>Log a follow-up</strong><small>Remember who to get back to</small></span></button><button class="quick-action" data-view="timesheet"><span class="quick-symbol">◷</span><span><strong>Build my timesheet</strong><small>Summarize work by project</small></span></button></div></section>'+
      '</div></div>';
  }
  function greeting() { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; }
  function focusTitle(pending,overdue,minutes) { if(overdue.length)return 'Clear one overdue follow-up.'; if(pending.length)return 'One thing at a time is enough.'; if(minutes>0)return 'You’ve captured today’s work.'; return 'A clear mind starts with a quick note.'; }
  function focusBody(pending,overdue,minutes) { if(overdue.length)return 'You have '+overdue.length+' item'+(overdue.length>1?'s':'')+' past the due date. A small update or a quick nudge is a good first step.'; if(pending.length)return 'You have '+pending.length+' open task'+(pending.length>1?'s':'')+'. Pick the one that matters most, and let the rest wait their turn.'; if(minutes>0)return 'Your work is recorded. Take a moment to check that any decisions and next steps are captured too.'; return 'Capture a thought, log a task or record time spent. You can organize it once it’s out of your head.'; }
  function renderList() {
    const isTasks=view==='tasks', isFollow=view==='followups';
    const title=isTasks?'My tasks':'Follow-ups';
    let list=entries.filter(e=>isTasks?e.type==='task':isFollow?e.type==='followup':true);
    if(listFilter==='open')list=list.filter(e=>!e.completed);
    if(listFilter==='done')list=list.filter(e=>e.completed);
    if(listFilter==='overdue')list=list.filter(isOverdue);
    if(listFilter==='today')list=list.filter(e=>e.date===today||e.due===today);
    list=matched(list);
    const body=list.length?'<div class="entry-list wide-list">'+list.map(e=>row(e,true)).join('')+'</div>':emptyState(searchTerm?'No matches found':'Nothing here yet',searchTerm?'Try a shorter search or clear the search field.':'Capture a '+(isTasks?'task':'follow-up')+' and it will be organized here.');
    return '<div class="page-heading section-heading"><div><p class="eyebrow">YOUR WORK / '+(isTasks?'TASKS':'FOLLOW-UPS')+'</p><h1>'+title+'</h1><p>'+(isTasks?'A focused list of the work you want to move forward.':'Keep promises, replies and hand-offs from slipping through the cracks.')+'</p></div><div class="heading-actions"><button class="btn-primary" data-action="'+(isFollow?'new-followup':'new-task')+'">+ '+(isFollow?'New follow-up':'New task')+'</button></div></div>'+
    '<div class="section-toolbar"><div class="filter-tabs">'+[['all','All'],['open','Open'],['today','Today'],['overdue','Overdue'],['done','Completed']].map(([value,label])=>'<button class="filter-tab '+(listFilter===value?'active':'')+'" data-action="filter" data-filter="'+value+'">'+label+'</button>').join('')+'</div><span style="color:#9aa4b3;font-size:10px">'+list.length+' entr'+(list.length===1?'y':'ies')+'</span></div>'+
    panel(isFollow?'Follow-up list':'Task list','Sorted with unfinished work first',body,'','list-panel');
  }
  function renderActivity() {
    const list=matched(entries);
    if(!list.length) return '<div class="page-heading section-heading"><div><p class="eyebrow">YOUR HISTORY</p><h1>All activity</h1><p>Your captured work, in one searchable timeline.</p></div><button class="btn-primary" data-action="new">+ New entry</button></div>'+panel('Activity history','Nothing to show yet',emptyState('Your timeline starts here','Capture work as it happens. It will be waiting here when you need it.'));
    const groups={}; list.forEach(e=>(groups[e.date||'Undated']??=[]).push(e));
    const inner=Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,items])=>'<div class="activity-date">'+esc(date==='Undated'?'UNDATED':fullDate(date).toUpperCase())+'</div>'+items.map(e=>'<div class="activity-item"><div class="activity-symbol">'+(e.type==='followup'?'↗':e.type==='task'?'☑':'✦')+'</div><div class="activity-body"><p><strong>'+esc(e.title)+'</strong></p><small>'+esc(e.project||'Personal')+' · '+(e.minutes?e.minutes+' min · ':'')+typeNames[e.type]+' · '+(e.completed?'Completed':'Open')+'</small></div><div class="activity-actions"><button class="more-btn" data-action="edit" data-id="'+esc(e.id)+'" aria-label="Edit entry" title="Edit entry">✎</button><button class="more-btn delete-btn" data-action="delete" data-id="'+esc(e.id)+'" aria-label="Delete entry" title="Delete entry">×</button></div></div>').join('')).join('');
    return '<div class="page-heading section-heading"><div><p class="eyebrow">YOUR HISTORY</p><h1>All activity</h1><p>Every task, note and follow-up you’ve captured, in one searchable timeline.</p></div><button class="btn-primary" data-action="new">+ New entry</button></div>'+panel('Activity timeline',list.length+' captured entries','<div class="wide-list" style="padding:0 20px 18px">'+inner+'</div>');
  }
  function projectGroups(list) {
    const groups={};
    list.forEach(e=>{ const project=e.project||'Unassigned'; (groups[project]??=[]).push(e); });
    return groups;
  }
  function makeSummary(list) {
    if(!list.length)return 'No work was captured in this period.';
    const groups=projectGroups(list);
    return Object.entries(groups).map(([project,items])=>{
      const descriptions=items.map(e=>e.title.replace(/[.!?]+$/,'')).filter(Boolean);
      const unique=[...new Set(descriptions)];
      const duration=items.reduce((sum,e)=>sum+(Number(e.minutes)||0),0);
      return project+': '+unique.join('; ')+(duration?' ('+duration+' minutes)':'');
    }).join('\n\n');
  }
  function renderTimesheet() {
    const start=timesheetStart, end=addDays(start,6);
    const list=entries.filter(e=>e.date>=start&&e.date<=end);
    const filtered=matched(list);
    const total=list.reduce((sum,e)=>sum+(Number(e.minutes)||0),0);
    const hours=Math.floor(total/60),mins=total%60;
    const grouped={};
    list.forEach(e=>(grouped[e.date]??=[]).push(e));
    let days='';
    for(let i=0;i<7;i++){
      const date=addDays(start,i), items=(grouped[date]||[]);
      const duration=items.reduce((sum,e)=>sum+(Number(e.minutes)||0),0);
      days+='<div class="timesheet-day"><div class="timesheet-date"><strong>'+esc(fullDate(date))+'</strong><span>'+duration+' min'+(duration?' · '+(duration/60).toFixed(1)+' h':'')+'</span></div>'+
      (items.length?items.map(e=>'<div class="timesheet-entry"><span style="flex:1">'+esc(e.title)+(e.project?' <span style="color:#a2aaba">· '+esc(e.project)+'</span>':'')+'</span><span style="white-space:nowrap;color:#99a3b3">'+(e.minutes||0)+'m</span><button class="more-btn" data-action="edit" data-id="'+esc(e.id)+'" aria-label="Edit entry" title="Edit entry">✎</button><button class="more-btn delete-btn" data-action="delete" data-id="'+esc(e.id)+'" aria-label="Delete entry" title="Delete entry">×</button></div>').join(''):'<p style="font-size:10px;color:#b0b7c2;margin:0">No entries recorded</p>')+'</div>';
    }
    const text=makeSummary(list);
    const projects=Object.entries(projectGroups(list)).map(([p,items])=>'<div class="timesheet-date"><strong>'+esc(p)+'</strong><span>'+items.reduce((s,e)=>s+(Number(e.minutes)||0),0)+' min</span></div>').join('');
    return '<div class="page-heading"><div><p class="eyebrow">REPORTING / WEEKLY SUMMARY</p><h1>Timesheet</h1><p>Turn the work you already captured into a clear weekly update.</p></div><div class="timesheet-toolbar"><button class="btn-secondary" data-action="prev-week">← Prev</button><span class="week-range">'+esc(fmtDate(start))+' – '+esc(fmtDate(end))+'</span><button class="btn-secondary" data-action="next-week">Next →</button></div></div>'+
      '<div class="stats-grid"><div class="stat-card"><div class="stat-top">Total time <span class="stat-icon blue">◷</span></div><div class="stat-value">'+hours+'<span style="font-size:13px;color:#9ba4b1">h</span> '+mins+'<span style="font-size:13px;color:#9ba4b1">m</span></div><div class="stat-caption">Time recorded this week</div></div><div class="stat-card"><div class="stat-top">Entries <span class="stat-icon violet">▤</span></div><div class="stat-value">'+list.length+'</div><div class="stat-caption">Tasks, notes and follow-ups</div></div><div class="stat-card"><div class="stat-top">Projects <span class="stat-icon green">⌘</span></div><div class="stat-value">'+Object.keys(projectGroups(list)).length+'</div><div class="stat-caption">Projects with recorded work</div></div><div class="stat-card"><div class="stat-top">Days captured <span class="stat-icon amber">▦</span></div><div class="stat-value">'+Object.keys(grouped).length+'</div><div class="stat-caption">Days with at least one entry</div></div></div>'+
      '<div class="timesheet-grid"><div>'+panel('Daily breakdown','Review and edit your captured work','<div style="padding:0 19px 15px">'+days+'</div>')+'</div>'+
      '<div class="right-stack"><section class="panel timesheet-summary-card"><p class="eyebrow">READY TO SHARE</p><h2 class="panel-title">Weekly work summary</h2><p class="panel-subtitle">Grouped by project, based on your entries.</p><div class="summary-total" style="margin-top:16px">'+(total/60).toFixed(1)+'<small> hours total</small></div><div class="summary-box"><strong>Summary text</strong><p style="white-space:pre-line" id="summary-preview">'+esc(text)+'</p></div><button class="btn-primary copy-summary" data-action="copy-summary">Copy summary ↗</button><button class="btn-secondary copy-summary" data-action="export-csv">Export detailed CSV ↓</button></section>'+panel('Time by project','Minutes recorded',projects||'<div class="empty-inline">No project time yet</div>')+'</div></div>';
  }
  function render() {
    renderCounts();
    $('#breadcrumb-current').textContent=({overview:'Overview',tasks:'My tasks',followups:'Follow-ups',timesheet:'Timesheet',activity:'All activity'})[view]||'Overview';
    $$('.nav-item').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===view));
    const content=view==='overview'?renderOverview():view==='tasks'||view==='followups'?renderList():view==='timesheet'?renderTimesheet():renderActivity();
    $('#app-content').innerHTML=content;
    $('#global-search').value=searchTerm;
    refreshProjectOptions();
  }
  function refreshProjectOptions() {
    const values=[...new Set(entries.map(e=>e.project).filter(Boolean))].sort();
    $('#project-options').innerHTML=values.map(p=>'<option value="'+esc(p)+'"></option>').join('');
  }
  function openModal(type='task',entry=null) {
    const modal=$('#entry-modal');
    $('#entry-form').reset();
    $('#entry-id').value=entry?.id||'';
    $('#entry-text').value=entry?.title||'';
    $('#entry-type').value=entry?.type||type||'task';
    $('#entry-project').value=entry?.project||'';
    $('#entry-date').value=entry?.date||activeDate||today;
    $('#entry-minutes').value=entry?.minutes||'';
    $('#entry-due').value=entry?.due||'';
    $('#save-entry-label').textContent=entry?'Save changes':'Save entry';
    $('#modal-title').textContent=entry?'Make a quick update.':'Get it out of your head.';
    $('#capture-hint-text').textContent='Tip: start with “follow up”, “remind me”, or “done” to get smart suggestions.';
    modal.classList.remove('hidden');
    setTimeout(()=>$('#entry-text').focus(),60);
  }
  function closeModal() { $('#entry-modal').classList.add('hidden'); }
  function inferType(text) {
    const t=text.toLowerCase();
    if(/\b(follow.?up|remind me|waiting for|check back|circle back|reply to|get back to|ask .+ about)\b/.test(t))return 'followup';
    if(/\b(note|remember|idea|thought|learned|decision)\b/.test(t))return 'note';
    return 'task';
  }
  function saveEntry(ev) {
    ev.preventDefault();
    const title=$('#entry-text').value.trim();
    if(!title){$('#entry-text').focus();return;}
    const oldId=$('#entry-id').value;
    const old=entries.find(e=>e.id===oldId);
    const entry={
      id:oldId||id(),title,type:$('#entry-type').value,project:$('#entry-project').value.trim(),
      date:$('#entry-date').value||today,minutes:Math.max(0,Math.min(1440,Number($('#entry-minutes').value)||0)),
      due:$('#entry-due').value,completed:old?.completed||false,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()
    };
    if(oldId)entries=entries.map(e=>e.id===oldId?entry:e);else entries.unshift(entry);
    persist();closeModal();render();toast(oldId?'Entry updated':'Added to your workspace'); 
  }
  function toggleEntry(entryId) {
    const e=entries.find(x=>x.id===entryId);if(!e)return;
    e.completed=!e.completed;e.completedAt=e.completed?new Date().toISOString():null;persist();render();
    toast(e.completed?'Marked as complete':'Moved back to open');
  }
  function deleteEntry(entryId) {
    const e=entries.find(x=>x.id===entryId);if(!e)return;
    if(!confirm('Delete this entry? This cannot be undone.'))return;
    entries=entries.filter(x=>x.id!==entryId);persist();render();toast('Entry deleted');
  }
  function csvCell(value) { return '"'+String(value??'').replace(/"/g,'""')+'"'; }
  function exportCSV() {
    const start=view==='timesheet'?timesheetStart:null;
    const current= start ? entries.filter(e=>e.date>=start&&e.date<=addDays(start,6)) : entries;
    const rows=[['Date','Project','Type','Description','Minutes','Hours','Due date','Status','Created at'],...current.sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(e=>[e.date,e.project,typeNames[e.type]||e.type,e.title,e.minutes,(Number(e.minutes||0)/60).toFixed(2),e.due,e.completed?'Completed':'Open',e.createdAt])];
    const blob=new Blob(['\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'});
    downloadBlob(blob,'workpulse-timesheet-'+(start||today)+'.csv');toast('CSV export is ready');
  }
  function exportBackup() {
    const backup={app:'WorkPulse',version:1,exportedAt:new Date().toISOString(),entries};
    downloadBlob(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),'workpulse-backup-'+today+'.json');
    toast('Backup downloaded');
  }
  function downloadBlob(blob,name) {
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function restoreBackup(file) {
    try {
      const data=JSON.parse(await file.text()), imported=Array.isArray(data)?data:data.entries;
      if(!Array.isArray(imported))throw new Error('The selected file is not a WorkPulse backup.');
      const clean=imported.filter(e=>e&&typeof e.title==='string'&&e.title.trim()).map(e=>({id:id(),title:e.title.slice(0,1500),type:['task','followup','note'].includes(e.type)?e.type:'task',project:String(e.project||'').slice(0,80),date:/^\d{4}-\d{2}-\d{2}$/.test(e.date||'')?e.date:today,minutes:Math.max(0,Math.min(1440,Number(e.minutes)||0)),due:/^\d{4}-\d{2}-\d{2}$/.test(e.due||'')?e.due:'',completed:!!e.completed,createdAt:e.createdAt||new Date().toISOString()}));
      entries=[...clean,...entries];persist();render();closeBackup();toast('Restored '+clean.length+' entries');
    } catch(err) { toast(err.message||'Could not restore that file.','error'); }
  }
  function showBackup() { $('#backup-modal').classList.remove('hidden'); }
  function closeBackup() { $('#backup-modal').classList.add('hidden'); }
  function switchView(next) { if(!next)return;view=next;listFilter='all';render();$('#sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'}); }
  function quickCapture(type='task') { openModal(type); }
  function copyText(text) {
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>toast('Copied to clipboard')).catch(()=>fallbackCopy(text));
    else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');toast('Copied to clipboard');}catch{toast('Could not access clipboard. Select and copy the text.','error');}
    ta.remove();
  }
  function startVoice() {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){toast('Voice input is not supported in this browser. Try a current version of Chrome or Edge.','error');return;}
    if(recognition){recognition.stop();recognition=null;return;}
    recognition=new SR();recognition.lang=navigator.language||'en-US';recognition.interimResults=true;recognition.continuous=false;
    const btn=$('#voice-capture');if(btn)btn.classList.add('recording');
    let finalText=$('#entry-text').value;
    recognition.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)finalText+=' '+e.results[i][0].transcript;else interim+=e.results[i][0].transcript;}$('#entry-text').value=(finalText+' '+interim).trim();};
    recognition.onerror=()=>toast('Voice capture stopped. You can type your note instead.','error');
    recognition.onend=()=>{recognition=null;const b=$('#voice-capture');if(b)b.classList.remove('recording');};
    recognition.start();toast('Listening… speak your note');
  }
  document.addEventListener('click',ev=>{
    const viewBtn=ev.target.closest('[data-view]');
    if(viewBtn){switchView(viewBtn.dataset.view);return;}
    const actionBtn=ev.target.closest('[data-action]');
    if(!actionBtn)return;
    const action=actionBtn.dataset.action,entryId=actionBtn.dataset.id;
    switch(action){
      case 'new':quickCapture();break;
      case 'new-task':quickCapture('task');break;
      case 'new-followup':quickCapture('followup');break;
      case 'toggle':toggleEntry(entryId);break;
      case 'edit':{const e=entries.find(x=>x.id===entryId);if(e)openModal(e.type,e);break;}
      case 'delete':deleteEntry(entryId);break;
      case 'filter':listFilter=actionBtn.dataset.filter;render();break;
      case 'select-day':activeDate=actionBtn.dataset.date;render();break;
      case 'prev-week':timesheetStart=addDays(timesheetStart,-7);render();break;
      case 'next-week':timesheetStart=addDays(timesheetStart,7);render();break;
      case 'copy-summary':copyText(makeSummary(entries.filter(e=>e.date>=timesheetStart&&e.date<=addDays(timesheetStart,6))));break;
      case 'export-csv':exportCSV();break;
      case 'voice':startVoice();break;
    }
  });
  $('#new-entry').addEventListener('click',()=>quickCapture());
  $('#topbar-add').addEventListener('click',()=>quickCapture());
  $('#close-modal').addEventListener('click',closeModal);
  $('#cancel-entry').addEventListener('click',closeModal);
  $('#entry-form').addEventListener('submit',saveEntry);
  $('#entry-text').addEventListener('input',()=>{
    const text=$('#entry-text').value.trim();
    if(!$('#entry-id').value&&text.length>6){
      const suggestion=inferType(text);
      if(suggestion==='followup'&&$('#entry-type').value==='task')$('#capture-hint-text').textContent='This sounds like a follow-up. WorkPulse can track it in your follow-up list.';
      else if(suggestion==='note'&&$('#entry-type').value==='task')$('#capture-hint-text').textContent='This sounds like a note or idea. Choose “Note” if there is no action to complete.';
      else $('#capture-hint-text').textContent='A good entry has a clear action and a little context. Add a project or time spent if useful.';
    }
  });
  $('#entry-type').addEventListener('change',()=>$('#capture-hint-text').textContent='Choose the type that best fits this entry. You can edit it later.');
  $('#entry-modal').addEventListener('click',ev=>{if(ev.target===$('#entry-modal'))closeModal();});
  $('#backup-modal').addEventListener('click',ev=>{if(ev.target===$('#backup-modal'))closeBackup();});
  $('#backup-button').addEventListener('click',showBackup);
  $('#close-backup').addEventListener('click',closeBackup);
  $('#download-backup').addEventListener('click',exportBackup);
  $('#restore-backup').addEventListener('click',()=>$('#backup-file').click());
  $('#backup-file').addEventListener('change',ev=>{if(ev.target.files?.[0])restoreBackup(ev.target.files[0]);ev.target.value='';});
  $('#export-button').addEventListener('click',exportCSV);
  $('#global-search').addEventListener('input',ev=>{searchTerm=ev.target.value;render();const box=$('.search-box');if(box&&window.innerWidth<=560)box.classList.add('expanded');const input=$('#global-search');input.focus();input.setSelectionRange(input.value.length,input.value.length);});
  $('#global-search').addEventListener('keydown',ev=>{if(ev.key==='Escape'){searchTerm='';$('#global-search').value='';render();}});
  $('#mobile-menu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  document.addEventListener('keydown',ev=>{
    const tag=document.activeElement?.tagName;
    if(ev.key==='Escape'){closeModal();closeBackup();$('#sidebar').classList.remove('open');}
    if((ev.key.toLowerCase()==='n')&&!ev.ctrlKey&&!ev.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(tag)&&!$('.modal-backdrop:not(.hidden)')){ev.preventDefault();quickCapture();}
    if(ev.key==='/'&&!ev.ctrlKey&&!ev.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(tag)){ev.preventDefault();$('#global-search').focus();}
  });
  // Seed a clearly-labelled demo workspace for the first visit.
  if(localStorage.getItem(STORE)===null) { load(); persist(); }
  else load();
  const PROFILE_KEY='workpulse.profile.v1';
  function applyProfile(profile) {
    const name=(profile?.name||'Your workspace').trim()||'Your workspace';
    const avatar=$('.sidebar-profile .avatar'), profileName=$('.sidebar-profile strong'), profileType=$('.sidebar-profile small');
    if(avatar)avatar.textContent=name.charAt(0).toUpperCase();
    if(profileName)profileName.textContent=name;
    if(profileType)profileType.textContent=profile?.email||'Personal workspace';
  }
  function closeWelcome(profile) {
    if(profile) { try { localStorage.setItem(PROFILE_KEY,JSON.stringify(profile)); } catch {} }
    $('#welcome-screen')?.classList.add('welcome-hidden');
    applyProfile(profile||{name:'Demo workspace'});
    render();
  }
  const existingProfile=(()=>{try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch{return null}})();
  $('#welcome-form').addEventListener('submit',ev=>{
    ev.preventDefault();
    const name=$('#profile-name').value.trim(), email=$('#profile-email').value.trim();
    if(!name){$('#profile-name').focus();return;}
    // A new personal workspace must not mix sample tasks into real work.
    // Keep the sample entries only when the visitor explicitly chooses demo mode.
    if(!existingProfile && entries.some(entry=>entry.demo)) {
      entries=entries.filter(entry=>!entry.demo);
      persist();
    }
    closeWelcome({name,email,createdAt:new Date().toISOString(),mode:'local'});
    toast('Your local workspace is ready. Add your first task when you’re ready.');
  });
  $('#explore-demo').addEventListener('click',()=>closeWelcome({name:'Demo workspace',email:'',mode:'demo'}));
  if(existingProfile){$('#welcome-screen').classList.add('welcome-hidden');applyProfile(existingProfile);}
  render();
})();
