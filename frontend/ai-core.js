/* Interview Mate – AI Interviewer core logic (no DOM here, so it can be unit-tested).
   Exposes window.AICore: categories, question picking, answer evaluation,
   voice analysis (pace / pauses / intensity / fillers) and the performance report builder. */
(function (root) {
'use strict';

const CATS = {
  hr:        { label: 'HR Interview',        icon: '🤝', mode: 'behav', desc: 'Behavioural and personality questions' },
  technical: { label: 'Technical Interview', icon: '💻', mode: 'tech',  desc: 'Concept questions on a subject you choose' },
  placement: { label: 'Placement Interview', icon: '🎓', mode: 'behav', desc: 'Campus-style mix: intro, project, company, situational' },
  coding:    { label: 'Coding Interview',    icon: '⌨️', mode: 'code',  desc: 'Explain your approach and write the code' }
};
const TOPICS = { python: 'Python', java: 'Java', web: 'Web Development', dbms: 'DBMS & SQL',
  dsa: 'Data Structures & Algorithms', oscn: 'OS & Networks', data: 'Data Analytics' };

/* [question, "keywords,comma,separated", level(1 fresher / 2 intermediate)] */
const HR = [
  ['Tell me about yourself.', 'student,skills,project,experience,goal,interest,strength', 1],
  ['Why should we hire you?', 'skills,value,contribute,team,learn,result,fit', 1],
  ['What is your biggest strength and a weakness you are working on?', 'strength,weakness,improve,example,learning,feedback', 1],
  ['Describe a conflict with a teammate and how you resolved it.', 'conflict,listen,situation,solution,team,result,communicate', 2],
  ['Tell me about a time you failed. What did you learn from it?', 'failure,mistake,learned,improve,responsibility,next', 2],
  ['How do you handle pressure and tight deadlines?', 'priority,plan,deadline,calm,schedule,communicate,break', 1],
  ['Where do you see yourself in five years?', 'grow,skills,goal,role,contribute,learn,leadership', 1],
  ['Why do you want to work with our company?', 'company,values,product,growth,culture,contribute,research', 1],
  ['Tell me about a time you showed leadership.', 'led,team,decision,motivate,responsibility,result,initiative', 2],
  ['How do you handle criticism or feedback?', 'feedback,listen,improve,learn,positive,apply', 1],
  ['What motivates you at work?', 'motivate,learn,impact,challenge,growth,team,goal', 1],
  ['Do you prefer working in a team or alone? Give an example.', 'team,collaborate,communicate,role,independent,balance', 1],
  ['Describe a time you had to learn something new very quickly.', 'learn,quickly,practice,resource,result,apply,outcome', 2]
];
const PLACEMENT = [
  ['Please introduce yourself.', 'student,skills,project,education,goal,strength,interest', 1],
  ['Tell me about your final-year or best project. What was your role?', 'project,role,problem,technology,result,team,challenge', 1],
  ['Why should we select you over other candidates?', 'skills,learn,value,team,contribute,fit,passion', 1],
  ['Are you willing to relocate, work in shifts or sign a service agreement?', 'flexible,relocate,shift,willing,learn,commitment,long-term', 1],
  ['Which technical subject are you strongest in? Explain one concept from it.', 'concept,example,subject,explain,used,simple', 1],
  ['What do you know about our company, and why do you want to join?', 'company,products,values,growth,learn,research', 1],
  ['Tell me about your internship or any practical experience.', 'internship,task,learned,tools,team,mentor,result', 1],
  ['How do you manage academics along with projects and activities?', 'time,schedule,priority,plan,balance,deadline,discipline', 1],
  ['How would you explain a low score or a gap in your academics?', 'reason,improve,learned,recovered,consistent,focus', 2],
  ['Estimate how many mobile phones are sold in India in a year. Walk me through your reasoning.', 'assume,population,estimate,percentage,households,replace,calculate', 2,
    'Break it down: population → people who buy phones → replacement cycle (e.g. 2–3 years) → units per year. State assumptions clearly and sanity-check the result.'],
  ['Tell me about a challenge in a team project and how you handled it.', 'situation,task,action,result,team,challenge', 1],
  ['If you get two offers, how will you choose between them?', 'growth,learning,company,role,salary,culture,decision', 2]
];
const TECH = {
  python: [
    ['What is the difference between a list and a tuple in Python?', 'mutable,immutable,tuple,list,memory,hashable,faster', 1],
    ['Explain *args and **kwargs.', 'arguments,tuple,dictionary,variable,positional,keyword', 1],
    ['What is the difference between a shallow copy and a deep copy?', 'copy,nested,reference,object,deepcopy,independent', 1],
    ['What are decorators and where would you use them?', 'function,wrapper,logging,authentication,higher-order,decorator', 2],
    ['What are generators and why are they useful?', 'yield,lazy,memory,iterator,large,next', 2],
    ['How does Python manage memory?', 'garbage,reference,counting,heap,private,collector', 2],
    ['What is the GIL in Python?', 'thread,global,interpreter,lock,multiprocessing,cpu', 2]
  ],
  java: [
    ['What are the four pillars of OOP? Explain with examples.', 'encapsulation,inheritance,polymorphism,abstraction,class,object', 1],
    ['What is the difference between an abstract class and an interface?', 'abstract,interface,multiple,inheritance,method,default,implement', 1],
    ['What is the difference between == and equals() in Java?', 'reference,value,string,object,compare,hashcode', 1],
    ['What are checked and unchecked exceptions?', 'compile,runtime,try,catch,throws,handle', 1],
    ['Explain how a HashMap works internally.', 'hash,bucket,collision,key,linked,equals,resize', 2],
    ['How does garbage collection work in Java?', 'heap,unreachable,jvm,generation,memory,collector', 2],
    ['What is multithreading and how do you avoid deadlocks?', 'thread,synchronized,lock,deadlock,resource,order', 2]
  ],
  web: [
    ['Explain the CSS box model.', 'margin,border,padding,content,width,box-sizing', 1],
    ['What is the difference between var, let and const?', 'scope,hoisting,block,reassign,function,const', 1],
    ['What are REST APIs and the common HTTP methods?', 'get,post,put,delete,stateless,json,endpoint', 1],
    ['What happens when you type a URL in the browser and press Enter?', 'dns,http,server,request,response,render,tcp', 2],
    ['Explain closures in JavaScript.', 'function,scope,lexical,variable,outer,private', 2],
    ['Compare localStorage, sessionStorage and cookies.', 'storage,session,expire,server,size,browser', 2],
    ['What is the difference between synchronous and asynchronous JavaScript?', 'promise,callback,await,event loop,non-blocking,async', 2]
  ],
  dbms: [
    ['What is the difference between INNER JOIN and LEFT JOIN?', 'join,rows,match,null,left,inner,table', 1],
    ['What is normalization? Explain 1NF, 2NF and 3NF.', 'redundancy,dependency,key,atomic,anomaly,table', 1],
    ['Explain the ACID properties of a transaction.', 'atomicity,consistency,isolation,durability,transaction,rollback', 1],
    ['Primary key vs foreign key vs unique key.', 'unique,null,reference,table,constraint,relationship', 1],
    ['Difference between WHERE and HAVING.', 'filter,group,aggregate,rows,having,where', 1],
    ['What is an index and when can it hurt performance?', 'index,search,faster,write,overhead,tree,query', 2],
    ['Difference between DELETE, TRUNCATE and DROP.', 'rows,rollback,structure,ddl,dml,table', 2]
  ],
  dsa: [
    ['Compare an array and a linked list.', 'memory,contiguous,insertion,access,index,pointer', 1],
    ['Explain stack and queue with a real-life use of each.', 'lifo,fifo,push,pop,enqueue,undo', 1],
    ['Explain binary search and its time complexity.', 'sorted,middle,log,divide,half,complexity', 1],
    ['Explain time and space complexity with an example.', 'big o,time,space,input,loop,growth,complexity', 1],
    ['How does a hash table handle collisions?', 'hash,bucket,chaining,probing,collision,load', 2],
    ['Compare BFS and DFS. When would you use each?', 'queue,stack,level,graph,shortest,recursion,visited', 2],
    ['What is dynamic programming?', 'overlapping,subproblem,memoization,optimal,table,recursion', 2]
  ],
  oscn: [
    ['What is the difference between a process and a thread?', 'memory,process,thread,context,shared,lightweight', 1],
    ['TCP vs UDP: differences and use cases.', 'reliable,connection,handshake,speed,packet,order,streaming', 1],
    ['Explain the layers of the OSI model.', 'layer,physical,network,transport,application,protocol,data', 1],
    ['What is a deadlock and what are its four conditions?', 'mutual exclusion,hold,wait,circular,preemption,resource', 2],
    ['Explain paging and virtual memory.', 'page,frame,virtual,ram,disk,fault,swap', 2],
    ['How does a DNS lookup work?', 'domain,ip,resolver,server,cache,root', 2]
  ],
  data: [
    ['How do you clean messy data before analysing it?', 'missing,duplicate,outlier,null,clean,pandas,validate', 1],
    ['Explain mean, median and mode. When do you use each?', 'mean,median,outlier,skewed,central,average', 1],
    ['Which charts would you use for trends and which for comparisons?', 'line,bar,trend,compare,time,category,visual', 1],
    ['How would you handle outliers in a dataset?', 'iqr,z-score,remove,investigate,cap,median,distribution', 2],
    ['Explain a p-value and hypothesis testing in simple words.', 'null,hypothesis,significance,probability,reject,sample', 2],
    ['What are overfitting and underfitting?', 'training,test,generalize,bias,variance,regularization', 2]
  ]
};
/* [problem, keywords, level, ideal approach] */
const CODING = [
  ['Two Sum: given an array of integers and a target, return the indices of the two numbers that add up to the target.', 'hash,map,dictionary,complement,loop,target,index', 1,
    'Store value → index in a hash map and look up (target − current) in a single pass: O(n) time, O(n) space. Brute force is O(n²).'],
  ['Write a function to check whether a string is a palindrome, ignoring case and non-alphanumeric characters.', 'two pointers,reverse,lower,alphanumeric,compare,loop,string', 1,
    'Clean the string, then compare with two pointers from both ends: O(n) time, O(1) extra space with pointers.'],
  ['FizzBuzz: for numbers 1 to N print Fizz for multiples of 3, Buzz for multiples of 5 and FizzBuzz for both.', 'modulo,loop,condition,15,both,order', 1,
    'Loop 1..N, check the "both" case (i % 15) first or build the string. O(N) time, O(1) space.'],
  ['Given a string of brackets ()[]{}, check whether it is valid.', 'stack,push,pop,match,opening,closing,map,empty', 1,
    'Use a stack: push openings, on a closing bracket pop and compare. Valid if the stack is empty at the end. O(n) time, O(n) space.'],
  ['Find the first non-repeating character in a string.', 'frequency,count,dictionary,hash,two passes,order', 1,
    'Pass 1 counts frequencies in a hash map; pass 2 returns the first char with count 1. O(n) time, O(1)/O(k) space.'],
  ['Check whether two strings are anagrams of each other.', 'sort,count,frequency,hash,length,lowercase', 1,
    'Compare lengths, then compare character counts (hash map / array of 26) in O(n), or sort both in O(n log n).'],
  ['Find the missing number in an array containing n distinct numbers from 1 to n+1.', 'sum,formula,xor,range,expected,difference', 1,
    'Expected sum n(n+1)/2 minus actual sum (or XOR trick): O(n) time, O(1) space.'],
  ['Merge two sorted arrays into one sorted array.', 'two pointers,sorted,merge,compare,index,remaining', 1,
    'Walk both arrays with two pointers, append the smaller element, then append the remainder: O(m+n).'],
  ['Implement binary search on a sorted array.', 'mid,low,high,sorted,log,half,loop', 1,
    'Maintain low/high, compare the middle element and discard half each step: O(log n) time. Use mid = low + (high − low) // 2.'],
  ['Find the length of the longest substring without repeating characters.', 'sliding window,set,hash,window,left,right,max', 2,
    'Sliding window with a set/dict of last-seen positions; move the left pointer on a repeat. O(n) time, O(k) space.'],
  ['Reverse a singly linked list.', 'pointer,prev,next,current,head,iterative,recursion', 2,
    'Iterate with prev/current/next pointers, flipping each link: O(n) time, O(1) space.'],
  ['Return the n-th Fibonacci number efficiently.', 'memoization,dp,recursion,cache,iterative,overlapping,linear', 2,
    'Naive recursion is O(2^n). Use memoization or a bottom-up loop with two variables: O(n) time, O(1) space.']
];

const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(e => e[1]);
const mk = (t, topic) => ({ q: t[0], kw: t[1].split(','), lv: t[2], ideal: t[3] || '', topic: topic || '' });

function pickQuestions(cat, topic, level, n) {
  let pool;
  if (cat === 'hr') pool = HR; else if (cat === 'placement') pool = PLACEMENT;
  else if (cat === 'coding') pool = CODING; else pool = TECH[topic] || TECH.python;
  const items = pool.map(t => mk(t, topic));
  let first = null;
  if (cat === 'hr' || cat === 'placement') first = items[0];          // always start with the introduction
  let rest = shuffle(items.filter(x => x !== first));
  rest = rest.map((x, i) => [Math.abs(x.lv - level) * 2 + Math.random(), x]).sort((a, b) => a[0] - b[0]).map(e => e[1]);
  const out = first ? [first].concat(rest) : rest;
  return out.slice(0, n);
}

/* ---------------- text helpers ---------------- */
const toks = t => (String(t || '').toLowerCase().match(/[a-z0-9']+/g) || []);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const avg = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const round1 = x => Math.round(x * 10) / 10;

const FILL_SINGLE = ['um', 'umm', 'uhm', 'uh', 'uhh', 'er', 'erm', 'ah', 'hmm', 'mm', 'mmm'];
const FILL_WORDS = ['basically', 'actually', 'literally', 'honestly'];
const FILL_PHRASES = ['you know', 'i mean', 'kind of', 'sort of', 'you see'];
const LIKE_SKIP = new Set(['would', 'i', 'we', 'you', 'they', 'to', 'looks', 'look', 'looking', 'feels', 'feel', 'sounds', 'seems',
  'something', 'anything', 'nothing', 'not', "don't", 'do', 'does', 'did', 'and', 'or', 'but', 'just', 'might', 'could', 'also',
  'very', 'really', 'more', 'most', 'much', 'what', 'is', 'was', 'be', 'it', "it's", 'as', 'such', 'that', 'this', 'other', 'unlike']);
const REPEAT_OK = new Set(['very', 'had', 'that', 'no']);

function countFillers(text) {
  const t = toks(text), map = {};
  const add = k => { map[k] = (map[k] || 0) + 1; };
  let repeats = 0;
  for (let i = 0; i < t.length; i++) {
    const w = t[i];
    if (FILL_SINGLE.includes(w) || FILL_WORDS.includes(w)) add(w);
    else if (w === 'like') { if (!LIKE_SKIP.has(t[i - 1] || '') && t[i + 1] !== 'to') add('like'); }
    else {
      for (const ph of FILL_PHRASES) {
        const p = ph.split(' ');
        if (w === p[0] && t[i + 1] === p[1]) { add(ph); i++; break; }
      }
    }
    if (i > 0 && t[i] === t[i - 1] && t[i].length <= 5 && !/\d/.test(t[i]) && !REPEAT_OK.has(t[i]) && !FILL_SINGLE.includes(t[i])) repeats++;
  }
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  const words = t.length;
  return { total, map, repeats, words, per100: words ? round1((total + repeats * 0.5) / words * 100) : 0 };
}
function topFillers(map, n) { return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n || 4); }

/* ---------------- answer evaluation (built-in, works offline) ---------------- */
const STAR = {
  s: ['situation', 'when', 'while', 'during', 'project', 'once', 'at that time', 'in my'],
  t: ['task', 'goal', 'responsible', 'needed to', 'aim', 'objective'],
  a: ['i built', 'i created', 'i used', 'i decided', 'i led', 'i analysed', 'i analyzed', 'i implemented', 'i developed', 'i designed',
      'i wrote', 'i worked', 'i organized', 'i organised', 'i handled', 'i spoke', 'i took', 'i made', 'i learned', 'i learnt', 'i started'],
  r: ['result', 'outcome', 'improved', 'increased', 'reduced', 'achieved', 'saved', 'learned', 'learnt', 'finally', 'successfully', 'as a result']
};
const TECH_MARK = ['for example', 'for instance', 'because', 'whereas', 'however', 'trade-off', 'tradeoff', 'advantage', 'disadvantage',
  'unlike', 'used to', 'used when', 'so that', 'which means', 'real-world', 'in practice', 'on the other hand', 'limitation'];

function depthScore(wc, lo, hi) {
  if (wc < 8) return 2;
  if (wc >= lo && wc <= hi) return 25;
  if (wc < lo) return Math.round(3 + (wc - 8) / (lo - 8) * 22);
  return Math.max(14, 25 - Math.round((wc - hi) / 20));
}
const P = (label, v, max) => ({ label, v: Math.round(clamp(v, 0, max)), max });

function evalBehavTech(o, mode) {
  const text = o.answer.trim(), low = text.toLowerCase(), wc = toks(text).length;
  const kw = o.q.kw || [], hits = kw.filter(k => low.includes(k)), missed = kw.filter(k => !hits.includes(k));
  const fl = countFillers(text);
  const has = l => l.filter(p => low.includes(p)).length;
  const star = { s: has(STAR.s), t: has(STAR.t), a: has(STAR.a), r: has(STAR.r) };
  const nums = (text.match(/\b\d+(\.\d+)?%?/g) || []).length;
  const caps = (text.match(/\b[A-Z][a-zA-Z+#]{2,}\b/g) || []).length;
  const hasEx = /for example|for instance|e\.g\.|such as|like when/.test(low);
  const marks = TECH_MARK.filter(m => low.includes(m)).length;

  const relevance = hits.length / Math.max(3, Math.min(5, kw.length)) * 30;
  const depth = mode === 'tech' ? depthScore(wc, 45, 140) : depthScore(wc, 65, 170);
  const structure = mode === 'tech'
    ? Math.min(20, marks * 5 + (hasEx ? 5 : 0))
    : Math.min(20, Object.values(star).filter(v => v > 0).length * 5);
  const specifics = Math.min(15, nums * 4 + Math.min(3, caps) * 2 + (hasEx ? 3 : 0));
  const clarity = wc < 8 ? 0 : clamp(10 - Math.max(0, fl.per100 - 2) * 1.2, 0, 10);
  const parts = [P('Relevance', relevance, 30), P('Depth', depth, 25), P(mode === 'tech' ? 'Explanation' : 'Structure (STAR)', structure, 20),
    P('Specifics', specifics, 15), P('Clarity', clarity, 10)];

  const strengths = [], improve = [];
  const pct = p => p.v / p.max;
  if (pct(parts[0]) >= .7) strengths.push('Used relevant terms' + (hits.length ? ' (' + hits.slice(0, 3).join(', ') + ')' : '') + '.');
  else if (pct(parts[0]) < .5) improve.push('Cover the key points' + (missed.length ? ', for example: ' + missed.slice(0, 3).join(', ') : '') + '.');
  if (pct(parts[1]) >= .75) strengths.push('Good answer length and detail.');
  else if (wc < 40) improve.push('The answer was short. Explain the "why" and add detail.');
  else if (wc > 170) improve.push('Tighten the answer. Aim for about 1–2 minutes.');
  if (mode === 'tech') {
    if (pct(parts[2]) >= .6) strengths.push('Explained with reasoning or examples.');
    else improve.push('Add a real example and mention a trade-off or a use-case.');
  } else {
    if (pct(parts[2]) >= .75) strengths.push('Well structured (situation → action → result).');
    else { if (!star.r) improve.push('Mention the result or outcome.'); if (!star.a) improve.push('Use "I" statements to show what you personally did.'); }
  }
  if (pct(parts[3]) >= .6) strengths.push('Concrete details (numbers, tools or examples).');
  else improve.push('Add numbers, tool names or a real example to make it concrete.');
  if (fl.per100 > 4) improve.push('Reduce filler words' + (fl.total ? ' (' + topFillers(fl.map, 2).map(e => e[0]).join(', ') + ')' : '') + '.');
  else if (wc >= 20) strengths.push('Clear delivery with few filler words.');

  const score = Math.round(parts.reduce((a, p) => a + p.v, 0));
  let fu;
  if (mode === 'tech') {
    if (!hasEx) fu = hits.length ? 'You mentioned "' + hits[0] + '". Can you give a real-world example where you used it?' : 'Can you explain that again with a simple real-world example?';
    else if (!/trade-off|tradeoff|limitation|disadvantage|however/.test(low)) fu = 'What are the limitations or trade-offs of this?';
    else fu = 'How would this change when the data or the traffic becomes very large?';
  } else {
    if (!star.r) fu = 'What was the final outcome, and how did you measure it?';
    else if (!nums) fu = 'Can you quantify that impact with a number or a percentage?';
    else if (!star.a) fu = 'What exactly was your personal contribution?';
    else fu = 'Looking back, what would you do differently?';
  }
  return { score, parts, strengths: strengths.slice(0, 3), improve: improve.slice(0, 4), followUp: fu, hits, missed, wc };
}

function bracketsBalanced(s) {
  const st = [], pairs = { ')': '(', ']': '[', '}': '{' };
  for (const ch of s) {
    if ('([{'.includes(ch)) st.push(ch);
    else if (pairs[ch]) { if (st.pop() !== pairs[ch]) return false; }
  }
  return st.length === 0;
}

function evalCode(o) {
  const text = o.answer.trim(), low = text.toLowerCase(), code = (o.code || '').trim();
  const wc = toks(text).length, all = low + ' ' + code.toLowerCase();
  const kw = o.q.kw || [], hits = kw.filter(k => all.includes(k)), missed = kw.filter(k => !hits.includes(k));
  const fl = countFillers(text);
  const hasCode = code.length >= 20;
  const fn = /\b(def|function|public|static|int|void|const|let|var|func|fn|=>)\b/.test(code);
  const loop = /\b(for|while|forEach|map|filter|reduce|recursion)\b/.test(code) || /\w+\s*\(.*\)/.test(code) && /return/.test(code) && /\b(if|else)\b/.test(code);
  const ret = /\b(return|print|console\.log|System\.out|cout)\b/.test(code);
  const bal = hasCode && bracketsBalanced(code);
  const complexity = /o\(|time complexity|space complexity|big o|linear|quadratic|logarithmic|constant time/.test(low);
  const edge = /edge|empty|null|none|negative|duplicate|single element|zero|invalid|corner|out of range/.test(all);
  const opt = /brute force|optimi[sz]|more efficient|better approach|improve|naive/.test(low);

  const approach = Math.min(30, hits.length / Math.max(3, Math.min(5, kw.length)) * 20 + (opt ? 5 : 0) + (wc >= 25 ? 5 : wc / 5));
  const codeP = (hasCode ? 10 : 0) + (hasCode && fn ? 5 : 0) + (hasCode && loop ? 5 : 0) + (hasCode && ret ? 5 : 0) + (bal ? 5 : 0);
  const parts = [P('Approach', approach, 30), P('Code', codeP, 30), P('Complexity', complexity ? 20 : 0, 20),
    P('Edge cases', edge ? 12 : 0, 12), P('Communication', wc < 8 ? 0 : clamp(8 - Math.max(0, fl.per100 - 3), 0, 8), 8)];
  const score = Math.round(parts.reduce((a, p) => a + p.v, 0));
  const strengths = [], improve = [];
  if (parts[0].v >= 20) strengths.push('Clear approach' + (hits.length ? ' (' + hits.slice(0, 3).join(', ') + ')' : '') + '.');
  else improve.push('Explain your approach first' + (missed.length ? ' (think: ' + missed.slice(0, 3).join(', ') + ')' : '') + ' before coding.');
  if (parts[1].v >= 25) strengths.push('Code looks complete and well-formed.');
  else if (!hasCode) improve.push('Write the code in the editor box, not only the explanation.');
  else improve.push('Make the code complete: a function, the main logic and a return value.');
  if (complexity) strengths.push('Stated the time/space complexity.'); else improve.push('Always state time and space complexity (Big-O).');
  if (edge) strengths.push('Considered edge cases.'); else improve.push('Mention edge cases: empty input, duplicates, negatives, a single element.');
  let fu;
  if (!complexity) fu = 'What are the time and space complexity of your solution?';
  else if (!edge) fu = 'Which edge cases would you test for this function?';
  else if (!opt) fu = 'Can this be optimised further, or is it already optimal? Why?';
  else fu = 'How would you write unit tests for this function?';
  return { score, parts, strengths: strengths.slice(0, 3), improve: improve.slice(0, 4), followUp: fu, hits, missed, wc };
}

function evaluate(o) {
  const mode = CATS[o.cat].mode;
  if (!o.answer.trim() && !(o.code || '').trim()) return skipped();
  const r = mode === 'code' ? evalCode(o) : evalBehavTech(o, mode);
  r.feedback = r.score >= 75 ? 'Good answer. It was clear and relevant.' : r.score >= 50 ? 'Decent answer, but it can be sharper.' : 'That needs more depth and structure.';
  r.ideal = o.q.ideal || '';
  r.engine = 'builtin';
  if (o.follow) r.followUp = '';
  return r;
}
function skipped() {
  return { score: 0, parts: [], strengths: [], improve: ['Skipped. Try to attempt every question, even a short answer helps.'], feedback: 'No problem, let us move on.',
    followUp: '', hits: [], missed: [], wc: 0, skipped: true, engine: 'builtin', ideal: '' };
}

/* ---------------- voice analysis ----------------
   samples = RMS amplitude (0..1) of the microphone, one value every `dt` seconds. */
function runs(v) {
  const r = []; let s = 0;
  for (let i = 1; i <= v.length; i++) if (i === v.length || v[i] !== v[s]) { r.push([s, i - 1, v[s]]); s = i; }
  return r;
}
const PAUSE_S = 1.2, LONG_PAUSE_S = 2.5;

function analyzeVoice(samples, words, rawText, dt) {
  dt = dt || 0.1;
  const n = samples.length;
  if (n < 10) return null;
  const sorted = samples.slice().sort((a, b) => a - b);
  const p10 = sorted[Math.floor(n * 0.1)];
  let peak = sorted[Math.floor(n * 0.9)];
  if (peak < 0.01) peak = sorted[Math.min(n - 1, Math.floor(n * 0.99))];   // very little speech: use the top 1 %
  if (peak < 0.01) return { silent: true, durationS: round1(n * dt) };
  const thr = Math.max(0.008, p10 + 0.25 * (peak - p10));
  const v = samples.map(x => x > thr);
  runs(v).forEach(([s, e, val]) => { if (val && e - s + 1 < 2) for (let i = s; i <= e; i++) v[i] = false; });      // clicks / blips
  const r2 = runs(v);
  r2.forEach(([s, e, val], idx) => { if (!val && e - s + 1 < 3 && idx > 0 && idx < r2.length - 1) for (let i = s; i <= e; i++) v[i] = true; }); // tiny gaps inside words
  const first = v.indexOf(true), last = v.lastIndexOf(true);
  if (first < 0) return { silent: true, durationS: round1(n * dt) };

  const pauses = [];
  runs(v).forEach(([s, e, val]) => {
    if (!val && s > first && e < last && (e - s + 1) * dt >= PAUSE_S) pauses.push({ at: round1(s * dt), len: round1((e - s + 1) * dt) });
  });
  const speakingS = v.filter(Boolean).length * dt, activeS = (last - first + 1) * dt;

  const perSec = [];
  for (let k = Math.floor(first * dt); k * 10 <= last; k++) {
    const vals = []; for (let i = k * 10; i < Math.min(n, k * 10 + 10); i++) if (v[i]) vals.push(samples[i]);
    perSec.push(vals.length >= 3 ? 20 * Math.log10(avg(vals) + 1e-8) : null);
  }
  const dbs = perSec.filter(x => x !== null);
  const avgDb = dbs.length ? avg(dbs) : -60;
  const std = dbs.length ? Math.sqrt(avg(dbs.map(x => (x - avgDb) ** 2))) : 0;
  let energy = 0;
  if (dbs.length >= 6) { const t = Math.floor(dbs.length / 3); energy = avg(dbs.slice(-t)) - avg(dbs.slice(0, t)); }
  const loudness = avgDb < -42 ? 'low' : avgDb < -36 ? 'soft' : avgDb <= -14 ? 'good' : 'high';
  const variation = std < 2.5 ? 'monotone' : std <= 6 ? 'natural' : 'uneven';

  const wc = words === null || words === undefined ? null : words;
  const wpm = wc !== null && wc >= 6 && activeS >= 4 ? Math.round(wc / (activeS / 60)) : null;
  const paceLabel = wpm === null ? null : wpm < 100 ? 'slow' : wpm < 115 ? 'slightly slow' : wpm <= 165 ? 'ideal' : wpm <= 185 ? 'slightly fast' : 'fast';
  const fillers = countFillers(rawText || '');
  return { silent: false, durationS: round1(n * dt), speakingS: round1(speakingS), activeS: round1(activeS), startDelayS: round1(first * dt),
    pauses, pauseCount: pauses.length, longPauseCount: pauses.filter(p => p.len >= LONG_PAUSE_S).length,
    pausesPerMin: round1(pauses.length / Math.max(activeS / 60, 0.25)),
    avgDb: round1(avgDb), dbStd: round1(std), energy: round1(energy), loudness, variation, timeline: perSec.map(x => x === null ? null : round1(x)),
    words: wc, wpm, paceLabel, fillers };
}

function voiceScore(v) {
  if (!v || v.silent) return null;
  const parts = [];
  if (v.wpm !== null) { const d = v.wpm < 115 ? 115 - v.wpm : v.wpm > 165 ? v.wpm - 165 : 0; parts.push(['Pace', 30 - clamp(d / 2, 0, 30), 30]); }
  if (v.fillers.words >= 15) parts.push(['Fluency (fillers)', clamp(30 - Math.max(0, v.fillers.per100 - 2) * 4, 0, 30), 30]);
  parts.push(['Pauses', clamp(25 - Math.max(0, v.pausesPerMin - 1) * 5 - v.longPauseCount * 2, 0, 25), 25]);
  let it = 15;
  it -= { low: 8, soft: 4, good: 0, high: 5 }[v.loudness]; if (v.variation === 'monotone') it -= 5; if (v.variation === 'uneven') it -= 3; if (v.energy <= -5) it -= 3;
  parts.push(['Intensity', clamp(it, 0, 15), 15]);
  const got = parts.reduce((a, p) => a + p[1], 0), max = parts.reduce((a, p) => a + p[2], 0);
  return { score: Math.round(got / max * 100), parts: parts.map(p => ({ label: p[0], pct: Math.round(p[1] / p[2] * 100) })) };
}

function voiceTips(v) {
  const good = [], bad = [];
  if (!v || v.silent) return { good, bad: ['No clear speech was detected. Check your microphone and speak closer to it.'] };
  if (v.wpm !== null) {
    if (v.paceLabel === 'ideal') good.push('Good speaking pace (' + v.wpm + ' words/min).');
    else if (v.wpm > 165) bad.push('You spoke fast (' + v.wpm + ' words/min). Slow down and pause after key points. Ideal is about 120–160.');
    else bad.push('You spoke slowly (' + v.wpm + ' words/min). Think in structured points so you can keep a steady flow. Ideal is about 120–160.');
  }
  if (v.fillers.words >= 15) {
    if (v.fillers.per100 <= 2) good.push('Very few filler words.');
    else {
      const list = topFillers(v.fillers.map, 3).map(e => '"' + e[0] + '" ×' + e[1]);
      if (v.fillers.repeats) list.push(v.fillers.repeats + ' repeated word' + (v.fillers.repeats > 1 ? 's' : ''));
      bad.push('Filler words / repetitions detected: ' + list.join(', ') + '. Replace them with a calm one-second pause.');
    }
  }
  if (v.pauseCount === 0) good.push('No long hesitation pauses.');
  else bad.push(v.pauseCount + ' pause' + (v.pauseCount > 1 ? 's' : '') + ' of over ' + PAUSE_S + ' s' + (v.longPauseCount ? ' (' + v.longPauseCount + ' longer than ' + LONG_PAUSE_S + ' s)' : '') + '. Plan your points (point → reason → example) so you do not stall.');
  if (v.startDelayS > 5) bad.push('You took ' + v.startDelayS + ' s to start answering. Take 2–3 seconds to think, then begin.');
  if (v.loudness === 'low') bad.push('Your voice was very soft. Speak louder and sit about 20–30 cm from the microphone.');
  else if (v.loudness === 'soft') bad.push('Your voice was a little soft. Project slightly more.');
  else if (v.loudness === 'high') bad.push('Your voice was very loud or close to the mic. Lower the volume a little.');
  else good.push('Good voice loudness.');
  if (v.variation === 'monotone') bad.push('Your voice sounded flat. Stress key words and vary your tone.');
  else if (v.variation === 'natural') good.push('Natural variation in voice intensity.');
  if (v.energy <= -5) bad.push('Your energy dropped towards the end. Finish strongly.');
  return { good, bad };
}

function aggregateVoice(list) {
  const L = list.filter(v => v && !v.silent);
  if (!L.length) return null;
  const act = L.reduce((a, v) => a + v.activeS, 0);
  const wl = L.filter(v => v.wpm !== null);
  const words = wl.reduce((a, v) => a + v.words, 0), wAct = wl.reduce((a, v) => a + v.activeS, 0);
  const fl = { total: 0, repeats: 0, words: 0, map: {} };
  L.forEach(v => { fl.total += v.fillers.total; fl.repeats += v.fillers.repeats; fl.words += v.fillers.words; Object.entries(v.fillers.map).forEach(([k, c]) => { fl.map[k] = (fl.map[k] || 0) + c; }); });
  fl.per100 = fl.words ? round1((fl.total + fl.repeats * 0.5) / fl.words * 100) : 0;
  const pauses = L.reduce((a, v) => a + v.pauseCount, 0), longP = L.reduce((a, v) => a + v.longPauseCount, 0);
  const wpm = wAct >= 4 && words >= 6 ? Math.round(words / (wAct / 60)) : null;
  const avgDb = round1(avg(L.map(v => v.avgDb)));
  const std = round1(avg(L.map(v => v.dbStd)));
  const scores = L.map(voiceScore).filter(Boolean).map(s => s.score);
  return {
    answers: L.length, wpm, paceLabel: wpm === null ? null : wpm < 100 ? 'slow' : wpm < 115 ? 'slightly slow' : wpm <= 165 ? 'ideal' : wpm <= 185 ? 'slightly fast' : 'fast',
    fillers: fl, pauses, longPauses: longP, pausesPerMin: round1(pauses / Math.max(act / 60, 0.25)), avgDb,
    loudness: avgDb < -42 ? 'low' : avgDb < -36 ? 'soft' : avgDb <= -14 ? 'good' : 'high', dbStd: std,
    variation: std < 2.5 ? 'monotone' : std <= 6 ? 'natural' : 'uneven', fadedCount: L.filter(v => v.energy <= -5).length,
    score: Math.round(avg(scores))
  };
}

/* ---------------- performance report ---------------- */
function verdict(s) { return s >= 80 ? 'Interview-ready' : s >= 65 ? 'Almost there' : s >= 45 ? 'Needs more practice' : 'Build the fundamentals'; }

function buildReport(S) {
  const turns = S.turns, answered = turns.filter(t => !t.eval.skipped);
  const content = turns.length ? Math.round(avg(turns.map(t => t.eval.score))) : 0;
  const voiceList = turns.map(t => t.voice).filter(Boolean);
  const va = aggregateVoice(voiceList);
  const overall = va ? Math.round(content * 0.65 + va.score * 0.35) : content;

  const sums = {};
  answered.forEach(t => (t.eval.parts || []).forEach(p => { const o = sums[p.label] || (sums[p.label] = { v: 0, max: 0 }); o.v += p.v; o.max += p.max; }));
  const breakdown = Object.entries(sums).map(([label, o]) => ({ label, pct: Math.round(o.v / o.max * 100) }));
  if (va) {
    const ps = voiceList.map(voiceScore).filter(Boolean);
    const byLabel = {};
    ps.forEach(s => s.parts.forEach(p => (byLabel[p.label] = byLabel[p.label] || []).push(p.pct)));
    Object.entries(byLabel).forEach(([label, xs]) => breakdown.push({ label: 'Voice: ' + label, pct: Math.round(avg(xs)) }));
  }

  const strengths = [], improve = [], plan = [];
  breakdown.filter(b => b.pct >= 75).sort((a, b) => b.pct - a.pct).slice(0, 3).forEach(b => strengths.push('Strong: ' + b.label + ' (' + b.pct + '%).'));
  const weak = breakdown.filter(b => b.pct < 55).sort((a, b) => a.pct - b.pct);
  weak.slice(0, 3).forEach(b => improve.push('Work on: ' + b.label + ' (' + b.pct + '%).'));
  if (va) {
    voiceTips({ silent: false, wpm: va.wpm, paceLabel: va.paceLabel, fillers: va.fillers, pauseCount: va.pauses, longPauseCount: va.longPauses,
      startDelayS: 0, loudness: va.loudness, variation: va.variation, energy: va.fadedCount ? -6 : 0 })
      .bad.slice(0, 3).forEach(t => improve.push(t));
    if (va.paceLabel === 'ideal') strengths.push('Your speaking pace is in the ideal range (' + va.wpm + ' words/min).');
    if (va.fillers.words >= 15 && va.fillers.per100 <= 2) strengths.push('Very clean speech with almost no filler words.');
  }
  const sk = turns.filter(t => t.eval.skipped).length;
  if (sk) improve.push('You skipped ' + sk + ' question' + (sk > 1 ? 's' : '') + '. Attempt every one, even with a short answer.');
  if (!strengths.length && answered.length) strengths.push('You completed the interview. Consistency is the first step.');

  const has = l => weak.some(b => b.label.toLowerCase().includes(l));
  const cat = CATS[S.cat].mode;
  if (va && va.fillers.words >= 15 && va.fillers.per100 > 3) plan.push('Daily: answer 3 questions aloud, record yourself, and replace every "um/like" with a silent one-second pause.');
  if (va && va.wpm && va.wpm > 165) plan.push('Pace drill: read a news paragraph aloud at about 140 words/min and pause after each sentence.');
  if (va && va.wpm && va.wpm < 115) plan.push('Pace drill: practise 60-second answers with exactly three points so your flow stays steady.');
  if (va && va.pausesPerMin > 2) plan.push('Prepare a 3-step skeleton (point → reason → example) for common questions so you do not stall. Use bridge phrases like "Let me think for a second".');
  if (va && (va.loudness === 'low' || va.loudness === 'soft')) plan.push('Sit upright, breathe from the diaphragm and keep the microphone about 20–30 cm away.');
  if (va && va.variation === 'monotone') plan.push('Tell a short story aloud and stress the key words to train vocal variation.');
  if (has('structure')) plan.push('Write 5 STAR stories (project, conflict, failure, leadership, deadline) and rehearse each in 90 seconds.');
  if (has('relevance') || has('explanation')) plan.push(cat === 'tech' ? 'For each topic write a 3-line note: definition → example → trade-off, then explain it aloud.' : 'Study the role keywords and use them naturally in your answers.');
  if (has('specifics')) plan.push('Add one number or tool name to every answer (e.g. "reduced load time by 30% using caching").');
  if (cat === 'code') plan.push('Solve one problem a day: explain the approach, state Big-O and list edge cases aloud before you write code.');
  plan.push('Repeat this interview in 7 days and compare your report scores.');

  const best = answered.length ? answered.reduce((a, b) => b.eval.score > a.eval.score ? b : a) : null;
  const summary = (S.name || 'Candidate') + ', you scored ' + overall + '/100 in your ' + CATS[S.cat].label.toLowerCase() + ' (' + verdict(overall).toLowerCase() + '). ' +
    'Answer quality was ' + content + '/100' + (va ? ' and voice delivery ' + va.score + '/100' : '') + '. ' +
    (best ? 'Your best answer was: "' + best.q.slice(0, 80) + (best.q.length > 80 ? '…' : '') + '". ' : '') +
    (weak[0] ? 'The biggest opportunity is ' + weak[0].label + '.' : 'Keep practising to stay sharp.');
  return { overall, content, voice: va ? va.score : null, verdict: verdict(overall), summary, breakdown, strengths: strengths.slice(0, 5),
    improve: improve.slice(0, 6), plan: plan.slice(0, 6), va, answeredCount: answered.length, total: turns.length };
}

root.AICore = { CATS, TOPICS, pickQuestions, evaluate, skipped, countFillers, topFillers, analyzeVoice, voiceScore, voiceTips,
  aggregateVoice, buildReport, verdict, toks, PAUSE_S };
})(typeof window !== 'undefined' ? window : globalThis);
