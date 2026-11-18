/* 大王来了 · 静态基线加载 + 浏览器端直连通道
   - 不设置 Referer / User-Agent：脚本无法设置，浏览器自动带；
   - 直连失败一律保留基线，不覆盖、不编造；
   - 分发层只送文件，实时数据由浏览器自己取。 */
(function(){
  var KS = ['__LIVE__','__SFC_NOW__','__SFC_PICK__','__CALIB__','__R9_DIV__',
            '__BJ_TWO_WAY__','__BJDC__','__DLT_PICK__','__COMBO_HISTORY__',
            '__JCWHY__','__RECHECK__','__TWO_WAY__','__MULTI__','__LGREF__',
            '__FACTOR_COV__','__SCORE_FUSE__','__R9_MIX_NOTE__'];
  var S = window.DAWANG_RT = {
    base: 'inline', epOk: 0, epTotal: 0, changed: 0, crs: 0, issue: 0,
    last: 0, note: '初始化', raw: {}
  };

  function badge(){
    var b = document.getElementById('dwrtBadge');
    if(!b){
      b = document.createElement('div');
      b.id = 'dwrtBadge';
      b.setAttribute('style','position:fixed;right:8px;bottom:8px;z-index:99999;'
        +'max-width:62vw;padding:5px 9px;border-radius:9px;font-size:11px;line-height:1.45;'
        +'background:rgba(18,20,26,.88);color:#dfe6f0;border:1px solid rgba(255,255,255,.14);'
        +'pointer-events:none;font-family:-apple-system,system-ui,sans-serif');
      document.body.appendChild(b);
    }
    var t = S.last ? new Date(S.last).toTimeString().slice(0,8) : '--:--:--';
    b.innerHTML = '<b>大王来了</b> · 基线 ' + S.base
      + '<br>通道 ' + S.epOk + '/' + S.epTotal + ' · ' + t
      + (S.changed ? ' · 系数更新 ' + S.changed + ' 场' : '')
      + (S.crs ? ' · 比分池 ' + S.crs : '')
      + (S.issue ? ' · 期池 ' + S.issue + ' 场' : '')
      + '<br><span style="opacity:.72">' + S.note + '</span>';
  }

  function redraw(){
    try{
      var L = window.__LIVE__ || {};
      (L.matches || []).forEach(function(m){
        m.src = m.src || (L.dim_names || []).map(function(){ return 'est'; });
        try{ if(typeof window.model==='function') m.r = window.model(m); }catch(e){}
        try{ if(typeof window.mergeOfficial==='function') window.mergeOfficial(m); }catch(e){}
        try{ if(typeof window.reweightScores==='function') window.reweightScores(m); }catch(e){}
      });
      ['renderR9','renderJc','renderBf','renderCombos','renderR920',
       'singleDirBlock','renderRecSrc','bdRender','renderBfNote'].forEach(function(f){
        try{ if(typeof window[f]==='function') window[f](); }catch(e){}
      });
    }catch(e){}
  }

  /* 基线覆盖必须逐场合并：整块换对象会把伤停/自动分/meta 一起冲掉。
     对照文档「期池重建冲掉伤停和自动分」——那边是重建，这边是装载，同一类。 */
  function applyVars(v){
    var n = 0;
    KS.forEach(function(k){
      if(!v || !Object.prototype.hasOwnProperty.call(v, k)) return;
      var nv = v[k], ov = window[k];
      if(k === '__LIVE__' && ov && typeof ov === 'object' && nv && typeof nv === 'object'){
        var merged = {}, p;
        for(p in ov){ if(ov.hasOwnProperty(p)) merged[p] = ov[p]; }
        for(p in nv){
          if(!nv.hasOwnProperty(p)) continue;
          if(p === 'matches' && Array.isArray(ov.matches) && Array.isArray(nv.matches)){
            merged.matches = ov.matches.map(function(old){
              var hit = null, q, i;
              for(i = 0; i < nv.matches.length; i++){
                q = nv.matches[i];
                if(String(q.num !== undefined ? q.num : q.no) ===
                   String(old.num !== undefined ? old.num : old.no)){ hit = q; break; }
              }
              if(!hit) return old;          // 基线有、新数据没有 -> 保留，不清空
              var o2 = {}, z;
              for(z in old){ if(old.hasOwnProperty(z)) o2[z] = old[z]; }
              for(z in hit){ if(hit.hasOwnProperty(z)) o2[z] = hit[z]; }
              return o2;                    // injuries/autoScores/autoReasons/meta 全带走
            });
          }else{ merged[p] = nv[p]; }
        }
        window[k] = merged;
      }else{ window[k] = nv; }
      n++;
    });
    return n;
  }

  /* 只接受能严格对齐的系数数组，其余一律不动 */
  function mergeCoef(data){
    var out = [];
    function walk(x){
      if(!x || typeof x !== 'object') return;
      if(Array.isArray(x)){
        if(x.length && typeof x[0] === 'object' &&
           (x[0].num !== undefined || x[0].no !== undefined) &&
           (Array.isArray(x[0].o) || Array.isArray(x[0].odds))){
          x.forEach(function(it){ out.push(it); });
        }else{
          x.slice(0, 40).forEach(walk);
        }
        return;
      }
      Object.keys(x).slice(0, 30).forEach(function(k){ walk(x[k]); });
    }
    walk(data);
    var live = (window.__LIVE__ || {}).matches || [];
    var ch = 0;
    out.forEach(function(it){
      var num = String(it.num !== undefined ? it.num : it.no);
      var arr = it.o || it.odds;
      if(!Array.isArray(arr) || arr.length < 3) return;
      if(!arr.every(function(z){ return typeof z === 'number' && z > 1; })) return;
      for(var i = 0; i < live.length; i++){
        if(String(live[i].num) === num || String(live[i].no) === num){
          live[i].o = arr.slice(); live[i].odds = arr.slice(); ch++;
          break;
        }
      }
    });
    return ch;
  }

  /* 官方比分返回扁平 map（s00s00 -> 系数），与引擎要的 {scores:[...]} 不同。
     两侧都做：抓数层归一化 + 消费侧防御，数据可能来自实时/快照/手工导入。 */
  function crsScores(v){
    var out = [];
    if(!v) return out;
    if(Array.isArray(v)){
      v.forEach(function(it){ if(it && typeof it === 'object') out.push(it); });
      return out;
    }
    if(typeof v === 'object'){
      if(Array.isArray(v.scores)) return crsScores(v.scores);
      Object.keys(v).slice(0, 200).forEach(function(k){
        var m = /^s(\d{1,2})s(\d{1,2})$/.exec(k), z = Number(v[k]);
        if(m && isFinite(z) && z > 1){
          out.push({h: +m[1], a: +m[2], s: m[1] + '-' + m[2], odds: z});
        }
      });
    }
    return out;
  }

  function mergeCrs(data){
    var n = 0, pool = [];
    function walk(x, d){
      if(!x || typeof x !== 'object' || d > 4) return;
      if(Array.isArray(x)){ x.slice(0, 40).forEach(function(y){ walk(y, d + 1); }); return; }
      Object.keys(x).slice(0, 30).forEach(function(k){
        if(/crs|score|bf/i.test(k)){
          crsScores(x[k]).forEach(function(it){ pool.push(it); });
        }
        walk(x[k], d + 1);
      });
    }
    walk(data, 0);
    if(pool.length){
      window.__CRS_SCORES__ = pool;
      var live = (window.__LIVE__ || {}).matches || [];
      live.forEach(function(m){
        if(m && m.crs && m.crs.scores && m.crs.scores.length) return;  // 引擎侧防御
        // 不猜测归属场次，只把归一化池挂到全局供页面按需消费
      });
      S.crs = pool.length; n = pool.length;
    }
    return n;
  }
  S.crsScores = crsScores;   // 暴露给验收脚本做反向断言
  S.applyVars = applyVars;   // 验「新基线缺字段时不冲掉伤停/自动分」
  S.expand = expand;         // 验「详情不再只查 matchId=1」

  function one(ep, cfg){
    var url = ep.abs
      ? (ep.abs + (ep.qs ? ('?' + ep.qs) : ''))
      : (cfg.base + ep.path + (ep.qs ? ('?' + ep.qs) : ''));
    var c = new AbortController();
    var t = setTimeout(function(){ c.abort(); }, (cfg.timeout || 8) * 1000);
    return fetch(url, {signal: c.signal, mode: 'cors',
                       cache: 'no-store', credentials: 'omit'})
      .then(function(r){
        clearTimeout(t);
        if(!r.ok) return {ok:false, key:ep.key, code:r.status};
        var p = ep.text ? r.text() : r.json();
        return p.then(function(j){ return {ok:true, key:ep.key, data:j, text:!!ep.text}; })
                .catch(function(){ return {ok:false, key:ep.key, code:'parse'}; });
      })
      .catch(function(e){
        clearTimeout(t);
        return {ok:false, key:ep.key, code: String((e && e.name) || 'net')};
      });
  }

  /* 按当前场次展开详情请求；并发上限 3，逐个独立请求，不压官方接口。 */
  function expand(cfg){
    var live = (window.__LIVE__ || {}).matches || [], out = [], seen = {};
    cfg.probe.forEach(function(ep){
      if(ep.each && live.length){
        live.slice(0, 30).forEach(function(m){
          var id = m.num !== undefined ? m.num : (m.no !== undefined ? m.no : m.matchId);
          if(id === undefined) return;
          var key = ep.key + ':' + id;
          if(seen[key]) return; seen[key] = 1;
          out.push({key: key, path: ep.path,
                    qs: (ep.qs || '').replace('{id}', encodeURIComponent(String(id)))});
        });
      }else{ out.push(ep); }
    });
    return out;
  }

  function pool(items, lim, fn){
    return new Promise(function(res){
      var i = 0, run = 0, rs = new Array(items.length);
      if(!items.length) return res(rs);
      (function next(){
        if(i >= items.length && run === 0) return res(rs);
        while(run < lim && i < items.length){
          (function(j){
            run++;
            fn(items[j]).then(function(v){ rs[j] = v; run--; next(); },
                              function(){ rs[j] = {ok:false}; run--; next(); });
          })(i++);
        }
      })();
    });
  }

  function runProbe(cfg){
    if(!cfg || !cfg.probe || !cfg.probe.length){
      S.epTotal = 0; S.epOk = 0;
      S.note = '未配置实时通道 · 基线保留';
      badge(); return;
    }
    var eps = expand(cfg);
    S.epTotal = eps.length;
    pool(eps, cfg.concurrency || 3, function(ep){ return one(ep, cfg); })
      .then(function(rs){
        var ok = 0, ch = 0;
        rs.forEach(function(r){
          if(!r || !r.ok) return;
          ok++;
          S.raw[r.key] = r.data;
          if(!r.text){ ch += mergeCoef(r.data); mergeCrs(r.data); }
        });
        S.epOk = ok; S.changed = ch; S.last = Date.now();
        S.note = ok ? '直连已连通 · 基线保留' : '直连未连通 · 基线保留（不编造）';
        if(ch || S.crs) redraw();
        badge();
      })
      .catch(function(){ S.note = '直连异常 · 基线保留'; badge(); });
  }

  function boot(){
    badge();
    var pBase = fetch('data/base.json?_=' + Date.now(), {cache:'no-store'})
      .then(function(r){ if(!r.ok) throw new Error('base'); return r.json(); })
      .then(function(j){
        var n = applyVars(j && j.vars);
        if(!n) throw new Error('empty');
        S.base = 'JSON(' + n + ')';
        S.note = '静态基线已装载';
        redraw();
      })
      .catch(function(){
        S.base = '内联';
        S.note = '静态基线不可达 · 使用内置快照';
      });
    var pEp = fetch('data/endpoints.json?_=' + Date.now(), {cache:'no-store'})
      .then(function(r){ if(!r.ok) throw new Error('ep'); return r.json(); })
      .catch(function(){ return null; });
    /* 期池是独立静态文件：不读它，前面「14 场已生成」就是假验证 */
    var pIssue = fetch('data/r9_issue.json?_=' + Date.now(), {cache:'no-store'})
      .then(function(r){ if(!r.ok) throw new Error('issue'); return r.json(); })
      .then(function(j){
        window.__R9_ISSUE__ = j;
        S.issue = (j && j.count) || 0;
        S.issueNote = (j && j.coef_source) || '';
      })
      .catch(function(){ S.issue = 0; });
    Promise.all([pBase, pEp, pIssue]).then(function(a){
      badge();
      var cfg = a[1];
      if(!/^https?:$/.test(location.protocol)){
        S.note = '本地文件模式 · 实时通道跳过（需 http 打开）';
        badge(); return;
      }
      runProbe(cfg);
      if(cfg && cfg.interval) setInterval(function(){ runProbe(cfg); }, cfg.interval * 1000);
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{ boot(); }
})();
