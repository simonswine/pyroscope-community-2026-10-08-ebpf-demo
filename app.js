const steps = [
  {label:'BUILD eBPF → LOAD FROM GO',art:['C → Clang → BPF','Go agent loads'],title:'Go orchestrates; eBPF runs in the kernel.',description:'The OTel profiler’s kernel-side C programs are compiled to eBPF objects with Clang/LLVM. Its Go agent is built separately, then loads those objects, prepares maps, and attaches programs to kernel events. The Go compiler does not compile Go code into eBPF.',note:'Two toolchains, two execution environments: C → eBPF for the kernel; Go → a native user-space agent. Maps and event buffers connect them.'},
  {label:'BYTECODE → VERIFIED PROGRAM',art:['BPF bytecode','Verifier ✓'],title:'Prove it fits the rules.',description:'Before loading a program, the kernel verifier analyzes its control flow and memory accesses. It checks properties such as valid pointer use, initialized values, and bounded execution. Unsafe programs are rejected.',note:'The verifier is a safety gate, not a promise that a program is bug-free. Permitted helpers and context access depend on the program type.'},
  {label:'KERNEL EVENT → EXECUTION',art:['Event hook','eBPF runs'],title:'An event brings the program to life.',description:'After verification, the program is attached to a supported hook: a network event, tracepoint, probe, or perf event. On most supported systems, the JIT translates BPF instructions into native machine code.',note:'For CPU profiling, perf events trigger periodic samples. eBPF does not run a permanent background loop inside the kernel.'},
  {label:'KERNEL → USER SPACE',art:['BPF maps','User-space agent'],title:'Keep the kernel work small.',description:'BPF maps store structured data that both eBPF programs and user-space tools can access. Depending on the tool, ring buffers or perf buffers also deliver events. User space handles heavier processing and export.',note:'In a profiler, the agent supplies unwinding metadata and processes collected stack information into usable profiles.'}
];
const tabs = [...document.querySelectorAll('[data-step]')];
function selectStep(index) {
  const step = steps[index];
  tabs.forEach((tab,i)=>{tab.classList.toggle('active',i===index);tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});
  document.getElementById('step-panel').setAttribute('aria-labelledby',`tab-${index}`);
  document.getElementById('step-label').textContent=step.label;
  const art=document.getElementById('step-art');art.replaceChildren();
  step.art.forEach((text,i)=>{if(i){const arrow=document.createElement('span');arrow.className='art-arrow';arrow.textContent='→';art.append(arrow);}const box=document.createElement('div');box.className='art-box';box.textContent=text;art.append(box);});
  document.getElementById('step-title').textContent=step.title;
  document.getElementById('step-description').textContent=step.description;
  document.getElementById('step-note').textContent=step.note;
}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectStep(index));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();selectStep(next);tabs[next].focus();}});});
const workloads={
  api:{rows:[[['JSON.encode',60],['query',25],['other',15]],[['handleRequest',85],['runtime',15]],[['http.serve',100]],[['api-service',100]]],insight:'JSON encoding appears in 60 of 100 samples. Investigate serialization on this hot path before assuming the database is the bottleneck.'},
  worker:{rows:[[['compress',70],['parse',20],['other',10]],[['processBatch',90],['runtime',10]],[['worker.run',100]],[['batch-worker',100]]],insight:'Compression appears in 70 of 100 samples. This workload is spending much of its sampled CPU activity transforming data.'},
  database:{rows:[[['hashJoin',55],['scan',30],['other',15]],[['executeQuery',85],['runtime',15]],[['connectionLoop',100]],[['database',100]]],insight:'The hash-join path appears in 55 of 100 samples. Inspect query plans and data shape; CPU sampling alone cannot measure time waiting on storage.'}
};
function selectWorkload(key){const data=workloads[key];document.querySelectorAll('[data-workload]').forEach(button=>{const selected=button.dataset.workload===key;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});const graph=document.getElementById('icicle-chart');graph.replaceChildren();[...data.rows].reverse().forEach(row=>{const line=document.createElement('div');line.className='icicle-row';row.forEach(([name,width])=>{const block=document.createElement('div');block.className='icicle-block';block.style.flex=`${width} 1 0`;block.textContent=name;block.title=`${name}: ${width} of 100 samples`;block.setAttribute('aria-label',block.title);line.append(block);});graph.append(line);});document.getElementById('profile-insight').textContent=data.insight;}
document.querySelectorAll('[data-workload]').forEach(button=>button.addEventListener('click',()=>selectWorkload(button.dataset.workload)));
selectStep(0);selectWorkload('api');
