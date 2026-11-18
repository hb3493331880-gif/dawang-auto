/* 大王来了 · 12 维面板逻辑（外链版） */

(function(){
'use strict';
var FW = {"brand":"大王来了","source_note":"12 个主维度名称与子项按用户提供的《足球赛事综合分析体系》思维导图 OCR 转录；模糊不可辨的子项已略去，不臆造。","status_note":"状态标注的是本项目当前真实数据链路：ok=有真实数据源并已上屏；partial=部分子项有源或仅有快照；none=当前无结构化数据源，页面不编造该维度打分。","policy":"本页只做维度覆盖度披露，不虚构 12 维概率打分。现有三项概率仍来自系数去水模型；维度真接进模型需要重新标定，未经确认不改动数字。","dims":[{"id":1,"name":"基本面分析","status":"ok","source":"甲组官方积分榜快照 + 历史交锋库 + 欧战排名/战意段","items":["球队实力定位","排名","近期战绩","风格相克","赛季目标","战意与轮换可能性","阵容厚度","俱乐部氛围"]},{"id":2,"name":"阵容因素","status":"ok","source":"甲组官方今日伤停接口（逐场人数；出口按时段放行，会波动）","items":["首发预测","核心伤停/停赛/复出","替补深度","后防状态"]},{"id":3,"name":"近期状态","status":"partial","source":"官方近况/历史交锋已接；近 5-10 场攻防趋势无结构化源","items":["近5-10场攻防趋势","赛程密度","连续客场","杯赛穿插","加时影响","领先/落后/平局表现","对阵强弱"]},{"id":4,"name":"战术对位","status":"none","source":"当前无阵型/控球/定位球/换人习惯的结构化数据","items":["阵型","控球/反击/高位逼抢/低位防守","定位球/高空球","攻防转换","教练临场调整/换人习惯","关键战/德比策略"]},{"id":5,"name":"数据验证","status":"partial","source":"主客场分拆等有历史库；xG/射正/禁区触球等无源","items":["射门/射正/控球/角球/犯规/黄牌","xG/xGA","预期进球差","危险进攻","禁区触球","主客场分拆","定位球得分率","门将扑救","转换效率"]},{"id":6,"name":"环境规则","status":"partial","source":"开赛时间/主客场/赛制有；草皮、天气、旅行距离无源","items":["赛制/淘汰赛/两回合/加时/点球","积分/净胜球需求","场地草皮/风","旅行距离","球迷氛围","主场优势","比赛时间"]},{"id":7,"name":"裁判纪律","status":"none","source":"当前无主裁尺度、场均牌数、VAR 倾向数据源","items":["主裁判尺度","场均牌数","点球倾向","VAR 习惯","易吃牌位置","冲突/德比判罚风险"]},{"id":8,"name":"个体心理","status":"none","source":"无球员心理数据源；战意段是积分/名次推断，不冒充心理数据","items":["关键球员状态","合同/转会传闻","心理压力","复仇/保级/争冠/德比心理","门将稳定性","锋线信心","后防失误率"]},{"id":9,"name":"市场验证","status":"ok","source":"澳客平均外部系数 + 甲组官方 SP + 让分/总数","items":["初盘/终盘","系数异常/系数变化","临场变盘","市场诱导","让分/总数变化","成交量冷热分布","赛前市场预期"]},{"id":10,"name":"信息源验证","status":"ok","source":"每轮固定披露 链路A / 实抓B / 快照C + 抓取时间戳","items":["俱乐部官网/联赛官媒/发布会","伤病报告/可靠记者","数据商/专业媒体交叉验证","排查过时信息","假伤停/轮换/烟雾弹识别","确认临场首发/天气突变","操纵风险排查","不确定性分级"]},{"id":11,"name":"剧本推演","status":"none","source":"目前只有定性文案，无剧本推演模型","items":["强队顺利取胜","弱队摆大巴/反击偷分","早早进球/半场闷平","下半场发力","红牌/VAR/点球争议","门将失误","临场变盘","淘汰赛两回合保守","加时点球","总数/比分/进球时间段","领先后控场/落后搏命","体能/替补决定走势","冷门/极端剧本风险校验"]},{"id":12,"name":"综合评估","status":"ok","source":"每日 2连1 定稿冻结 + 背离/战意/风险等级 + 置信度文案","items":["多维度信息汇总","置信度评估","风险等级","持续优化"]}]};
var BRAND = '大王来了';
try{ document.title = '大王来了 · 赛事研判台（甲组 / 乙组 / 丙组）'; }catch(e){}
try{
  var tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, null), n;
  while((n = tw.nextNode())){
    if(!n.nodeValue) continue;
    if(n.parentNode && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.parentNode.nodeName)) continue;
    var v = n.nodeValue;
    if(v.indexOf('HB 大王来了') >= 0 || v.indexOf('HB竞技扫盘') >= 0){
      n.nodeValue = v.replace(/HB 大王来了/g, BRAND).replace(/HB竞技扫盘/g, '· 12维分析');
    }
  }
}catch(e){}
var css = document.getElementById('ds12css');
var btn = document.createElement('div');
btn.className='ds12-btn'; btn.title = BRAND + ' · 12维体系'; btn.textContent=String.fromCodePoint(0x1F9ED);
var mask = document.createElement('div'); mask.className='ds12-mask';
var wrap = document.createElement('div'); wrap.className='ds12-wrap';
function esc(s){ return String(s==null?'':s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;'); }
var cnt={ok:0,partial:0,none:0}; FW.dims.forEach(function(d){ if(cnt[d.status]!=null) cnt[d.status]++; });
var badge={ok:['已接','ds12-ok'],partial:['部分','ds12-partial'],none:['缺源','ds12-none']};
var h = '<div class="ds12-hd"><button class="ds12-close" id="ds12x">\u00d7<\/button>'+
 '<h2>'+esc(BRAND)+' · 12 维综合分析体系<\/h2>'+
 '<p>按你给的导图逐维落地；状态只标真实数据链路，不编打分。<\/p>'+
 '<p id="ds12live">自动更新：检测中…<\/p><\/div>';
h += '<div class="ds12-sum"><b>覆盖度<\/b>：已接 '+cnt.ok+' 维 · 部分 '+cnt.partial+' 维 · 缺源 '+cnt.none+' 维（共 12 维）。<br>'+
 esc(FW.status_note)+'<\/div>';
h += '<div class="ds12-grid">';
FW.dims.forEach(function(d){
  var b=badge[d.status]||badge.none;
  h += '<div class="ds12-card"><div class="ds12-t"><span class="ds12-no">'+d.id+'<\/span>'+esc(d.name)+
       '<span class="ds12-badge '+b[1]+'">'+b[0]+'<\/span><\/div>'+
       '<div class="ds12-src">'+esc(d.source)+'<\/div><div class="ds12-items">'+
       d.items.map(function(x){return '<span>'+esc(x)+'<\/span>';}).join('')+'<\/div><\/div>';
});
h += '<\/div><div class="ds12-foot"><b>口径<\/b>：'+esc(FW.policy)+'<br>'+esc(FW.source_note)+'<\/div>';
wrap.innerHTML=h;
document.body.appendChild(btn); document.body.appendChild(mask); document.body.appendChild(wrap);
function show(v){ wrap.style.display=v?'block':'none'; mask.style.display=v?'block':'none'; }
btn.addEventListener('click',function(){show(true);});
mask.addEventListener('click',function(){show(false);});
wrap.addEventListener('click',function(e){ if(e.target && e.target.id==='ds12x') show(false); });
// 站点自动更新：同源 data/manifest.json 的 md5 变化即自动刷新；file:// 离线打开时静默跳过
var last=null;
function poll(){
  if(!/^https?:$/.test(location.protocol)) return;
  fetch('data/manifest.json?_='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).catch(function(){ return fetch('?__poll=1&_='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}); }).then(function(j){
    if(!j || !j.md5) return;
    var el=document.getElementById('ds12live');
    if(el){ el.textContent='自动更新：'+(j.auto?'开（每 '+Math.round(j.interval/60)+' 分钟）':'关')+
      ' · 页面 '+(j.updated||'未知')+' · 上轮 '+(j.last_result||'未记录'); }
    if(last===null){ last=j.md5; return; }
    if(j.md5!==last) location.reload(true);
  }).catch(function(){});
}
poll(); setInterval(poll, 30000);
window.DASONG12D = {dims:FW.dims.length, brand:BRAND};
})();
