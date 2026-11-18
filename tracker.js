'use strict';
const db = supabase.createClient('https://vtsqazxhszbmwiswthgt.supabase.co', 'sb_publishable_4KjgwIbzTvjOVcqz0AB7Eg_5rJLruG3', {
  auth: { storageKey: 'cow-pmr-tracker-session' }
});
const el = id => document.getElementById(id);
const equipment = ['Gen', 'DC', 'HVAC', 'AC', 'FACP', 'SACP'];
const dimensions = [...equipment, 'Other', 'NA'];
const statuses = ['Open', 'In Progress', 'Pending ACES', 'Pending stc', 'Closed'];
const regions = ['Central', 'West', 'East', 'South'];
const columns = 'id,site_id,region,issue_date,description,owner,mitigation_date,action_plan,status,dimensions,updated_at';
const pageSize = 30;
let records = [], allowed = [], currentUser = null, selected, page = 1, request = 0, saving = false;

function options(id, values, initial) {
  const target = el(id), prior = target.value;
  target.replaceChildren();
  if (initial) target.add(new Option(initial, ''));
  for (const value of values) target.add(new Option(value, value));
  if (values.includes(prior)) target.value = prior;
}
options('dimension', dimensions, 'All dimensions');
options('status', statuses, 'All statuses');
options('editStatus', statuses);

function stats(rows) {
  const closed = rows.filter(row => row.status === 'Closed').length;
  const unique = new Set(rows.map(row => row.site_id.trim().toUpperCase())).size;
  return [rows.length, unique, rows.length - closed, closed];
}

function svg(name, attributes, value) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, val] of Object.entries(attributes)) node.setAttribute(key, val);
  if (value !== undefined) node.textContent = value;
  return node;
}

function hexagon(rows) {
  const target = el('hex');
  const counts = Object.fromEntries(dimensions.map(name => [name, 0]));
  for (const row of rows) for (const name of row.dimensions) if (name in counts) counts[name]++;
  const values = equipment.map(name => counts[name]);
  const max = Math.max(...values, 1);
  const point = (i, radius) => {
    const angle = i * Math.PI / 3 - Math.PI / 2;
    return [240 + Math.cos(angle) * radius, 175 + Math.sin(angle) * radius];
  };
  const polygon = values => values.map((value, i) => point(i, value).join(',')).join(' ');
  target.replaceChildren();
  for (const radius of [25, 50, 75, 100]) {
    target.append(svg('polygon', {points: polygon(equipment.map(() => radius)), fill:'none', stroke:'#dfd1e9'}));
  }
  for (let i = 0; i < equipment.length; i++) {
    const [x,y] = point(i,100);
    target.append(svg('line', {x1:240,y1:175,x2:x,y2:y,stroke:'#dfd1e9'}));
  }
  target.append(svg('polygon', {points:polygon(values.map(value => 100 * value / max)),fill:'#8852b4', 'fill-opacity':'.29',stroke:'#67358c','stroke-width':3}));
  equipment.forEach((name,i) => {
    const [x,y] = point(i,145);
    const active = el('dimension').value === name;
    const group = svg('g', {role:'button',tabindex:0,'aria-label':name+' '+counts[name]+' findings', 'aria-pressed':active});
    group.append(svg('rect',{x:x-39,y:y-21,width:78,height:42,rx:9,fill:active?'#ece0f4':'#f5eff9'}));
    group.append(svg('text',{x,y:y-3,'text-anchor':'middle',fill:'#512875','font-size':12},name));
    group.append(svg('text',{x,y:y+14,'text-anchor':'middle',fill:'#241636','font-weight':700,'font-size':17},counts[name]));
    const filter = () => { el('dimension').value = active ? '' : name; page=1; render(); target.querySelectorAll('g')[i]?.focus(); };
    group.addEventListener('click',filter);
    group.addEventListener('keydown',event => { if (['Enter',' '].includes(event.key)) { event.preventDefault(); filter(); } });
    target.append(group);
  });
  const mixed = rows.filter(row => row.dimensions.filter(name => equipment.includes(name)).length > 1).length;
  el('dimensionNote').textContent = 'Other: '+counts.Other+' · NA: '+counts.NA+' · '+mixed+' findings counted in multiple equipment dimensions.';
}

function drawSummary() {
  el('regional').replaceChildren();
  for (const name of allowed) {
    const row = el('regional').insertRow();
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.onclick = () => { el('region').value = name; page=1; render(); };
    row.insertCell().append(button);
    stats(records.filter(finding => finding.region === name)).forEach(value => row.insertCell().textContent = value);
  }
}

function render() {
  const region = el('region').value;
  const regional = records.filter(row => !region || row.region === region);
  const metrics = el('metrics');
  metrics.replaceChildren();
  stats(regional).forEach((value,i) => {
    const card = document.createElement('div');
    card.className = 'metric';
    const count = document.createElement('strong');
    count.textContent = value;
    card.append(['Findings','Unique COWs','Unclosed','Closed'][i],count);
    metrics.append(card);
  });
  hexagon(regional);
  const query = el('search').value.trim().toLowerCase();
  const status = el('status').value, dimension = el('dimension').value;
  const filtered = regional.filter(row => (!status || row.status === status) &&
    (!dimension || row.dimensions.includes(dimension)) &&
    (!query || [row.id,row.site_id,row.owner,row.description,row.action_plan].join(' ').toLowerCase().includes(query)));
  const pages = Math.max(1,Math.ceil(filtered.length/pageSize));
  page = Math.min(page,pages);
  el('previous').disabled = page === 1;
  el('next').disabled = page === pages;
  el('pagination').textContent = filtered.length+' matching findings · Page '+page+' of '+pages;
  const body = el('findings');
  body.replaceChildren();
  if (!filtered.length) {
    const cell = body.insertRow().insertCell();
    cell.colSpan = 11; cell.textContent = 'No findings match these filters.';
  }
  for (const finding of filtered.slice((page-1)*pageSize,page*pageSize)) {
    const row = body.insertRow();
    for (const value of [finding.id,finding.site_id,finding.region,finding.issue_date,finding.description,
      finding.dimensions.join(', '),finding.owner,finding.mitigation_date,finding.action_plan,finding.status]) {
      row.insertCell().textContent = value || '–';
    }
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = 'Edit';
    button.setAttribute('aria-label','Edit finding '+finding.id);
    button.onclick = () => openEditor(finding);
    row.insertCell().append(button);
  }
}

async function load() {
  const token = ++request;
  el('refresh').disabled = true;
  el('notice').textContent = 'Loading findings…';
  try {
    const access = await db.from('pmr_region_members').select('region');
    if (access.error) throw access.error;
    const permitted = regions.filter(region => access.data.some(item => item.region === region));
    const result = [];
    if (permitted.length) {
      const batch = 250;
      for (let start = 0;;start += batch) {
        const {data,error} = await db.from('pmr_findings').select(columns).order('id').range(start,start+batch-1);
        if (token !== request) return;
        if (error) throw error;
        result.push(...data);
        if (data.length < batch) break;
      }
    }
    if (token !== request) return;
    records = result; allowed = permitted;
    options('region',allowed,'All assigned regions');
    drawSummary(); render();
    el('dashboard').hidden = !allowed.length;
    el('notice').textContent = allowed.length ? '' : 'Your account has no PMR region assignment. Contact the tracker administrator.';
  } catch (error) {
    if (token === request) {
      el('dashboard').hidden = true;
      el('notice').textContent = 'Could not load the tracker. ' + error.message;
    }
  } finally {
    if (token === request) el('refresh').disabled = false;
  }
}

function openEditor(finding) {
  selected = finding;
  el('editTitle').textContent = '#'+finding.id+' · '+finding.site_id+' · '+finding.region;
  el('editDescription').textContent = finding.description;
  el('mitigation').value = finding.mitigation_date || '';
  el('plan').value = finding.action_plan;
  el('editStatus').value = finding.status;
  el('formError').textContent = '';
  el('editor').showModal();
}

el('editForm').onsubmit = async event => {
  event.preventDefault();
  if (saving || !selected) return;
  const finding = selected, userId = currentUser;
  const patch = {mitigation_date:el('mitigation').value || null, action_plan:el('plan').value.trim(), status:el('editStatus').value};
  if (patch.status === 'Closed' && !patch.action_plan) {
    el('formError').textContent = 'Enter the action taken before closing this finding.';
    return;
  }
  saving = el('save').disabled = el('cancel').disabled = true;
  el('formError').textContent = '';
  try {
    const {data,error} = await db.from('pmr_findings').update(patch)
      .eq('id',finding.id).eq('updated_at',finding.updated_at).select(columns).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('This finding changed or is no longer accessible. Close the editor and refresh.');
    if (currentUser !== userId) return;
    if (el('editor').open) el('editor').close();
    await load();
    if (currentUser === userId && !el('notice').textContent) el('notice').textContent = 'Saved finding #'+data.id+'.';
  } catch (error) {
    if (currentUser === userId) el('formError').textContent = error.message;
  } finally {
    saving = el('save').disabled = el('cancel').disabled = false;
  }
};
el('editor').addEventListener('cancel',event => { if (saving) event.preventDefault(); });
el('cancel').onclick = () => el('editor').close();
el('refresh').onclick = load;
el('previous').onclick = () => { page--; render(); };
el('next').onclick = () => { page++; render(); };
for (const id of ['region','dimension','status','search']) el(id).addEventListener('input',() => { page=1;render(); });

el('signIn').onsubmit = async event => {
  event.preventDefault();
  el('loginButton').disabled = true;
  el('authError').textContent = '';
  try {
    const {error} = await db.auth.signInWithPassword({email:el('loginEmail').value.trim(),password:el('password').value});
    if (error) throw error;
    el('password').value = '';
  } catch (error) {
    el('authError').textContent = error.message;
  } finally {
    el('loginButton').disabled = false;
  }
};
el('logout').onclick = async () => {
  const {error} = await db.auth.signOut({scope:'local'});
  if (error) el('notice').textContent = error.message;
};
db.auth.onAuthStateChange((event, session) => {
  const id = session?.user.id ?? null;
  if (event !== 'INITIAL_SESSION' && id === currentUser) return;
  currentUser = id;
  request++;
  records = []; allowed = []; selected = null; page = 1;
  if (el('editor').open) el('editor').close();
  el('dashboard').hidden = true;
  el('account').hidden = !id;
  el('login').hidden = !!id;
  el('email').textContent = session?.user.email ?? '';
  el('notice').textContent = '';
  if (id) setTimeout(() => { if (id === currentUser) load(); },0);
});
