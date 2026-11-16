import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Users, Ship, Award, AlertTriangle, X, Save } from 'lucide-react'
import { supabase } from './supabase'

const blank = {
  members: { vessel_id:'', full_name:'', email:'', phone:'', emergency_contact_name:'', emergency_contact_phone:'', notes:'', is_active:true },
  assignments: { vessel_id:'', crew_member_id:'', position_onboard:'', starts_at:'', ends_at:'', is_active:true, notes:'' },
  qualifications: { vessel_id:'', crew_member_id:'', qualification_name:'', issuing_authority:'', certificate_number:'', issued_at:'', expires_at:'', notes:'' }
}
const fmt = value => value ? new Date(value+'T00:00:00').toLocaleDateString('pt-PT') : '—'

export default function Crew({ vessels=[], notify=()=>{}, lang='pt' }) {
  const pt = lang === 'pt'
  const t = (a,b) => pt ? a : b
  const [tab,setTab] = useState('members')
  const [data,setData] = useState({members:[],assignments:[],qualifications:[]})
  const [loading,setLoading] = useState(true)
  const [query,setQuery] = useState('')
  const [vessel,setVessel] = useState('all')
  const [modal,setModal] = useState('')
  const [editing,setEditing] = useState(null)
  const [form,setForm] = useState(blank.members)
  const [saving,setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [m,a,q] = await Promise.all([
      supabase.from('crew_members').select('*').order('full_name'),
      supabase.from('crew_assignments').select('*').order('starts_at',{ascending:false}),
      supabase.from('crew_qualifications').select('*').order('expires_at')
    ])
    const error = m.error || a.error || q.error
    if (error) notify(error.message,true)
    setData({members:m.data||[],assignments:a.data||[],qualifications:q.data||[]})
    setLoading(false)
  }
  useEffect(()=>{ load() },[])
  const vesselName = id => vessels.find(v=>v.id===id)?.name || '—'
  const memberName = id => data.members.find(m=>m.id===id)?.full_name || '—'
  const matches = row => {
    if (vessel!=='all' && row.vessel_id!==vessel) return false
    if (!query) return true
    const text = tab==='members' ? [row.full_name,row.email,row.phone] : tab==='assignments' ? [memberName(row.crew_member_id),row.position_onboard] : [memberName(row.crew_member_id),row.qualification_name,row.certificate_number]
    return text.some(x=>(x||'').toLowerCase().includes(query.toLowerCase()))
  }
  const rows = useMemo(()=>data[tab].filter(matches),[data,tab,vessel,query])
  const expiring = data.qualifications.filter(q=>q.expires_at && new Date(q.expires_at+'T00:00:00')>=new Date() && new Date(q.expires_at+'T00:00:00')<=new Date(Date.now()+30*86400000)).length

  function open(kind,row=null) {
    setEditing(row)
    setModal(kind)
    const defaultVessel = vessel!=='all' ? vessel : vessels[0]?.id || ''
    const member = data.members.find(m=>m.vessel_id===(row?.vessel_id||defaultVessel))
    setForm(row ? {...row} : {...blank[kind],vessel_id:defaultVessel,crew_member_id:member?.id||''})
  }
  const set = (key,value) => setForm(f=>({...f,[key]:value}))
  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const table = modal==='members' ? 'crew_members' : modal==='assignments' ? 'crew_assignments' : 'crew_qualifications'
    const payload = {...form}
    if (modal==='members') payload.full_name=payload.full_name.trim()
    for (const key of ['starts_at','ends_at','issued_at','expires_at']) if(payload[key]==='') payload[key]=null
    const result = editing ? await supabase.from(table).update(payload).eq('id',editing.id) : await supabase.from(table).insert(payload)
    if (result.error) notify(result.error.message,true)
    else { notify(t('Registo guardado com sucesso.','Record saved successfully.')); setModal(''); await load() }
    setSaving(false)
  }
  async function remove(kind,row) {
    if (!window.confirm(t('Tens a certeza de que pretendes eliminar este registo?','Are you sure you want to delete this record?'))) return
    const table=kind==='members'?'crew_members':kind==='assignments'?'crew_assignments':'crew_qualifications'
    const {error}=await supabase.from(table).delete().eq('id',row.id)
    if(error) notify(error.message,true)
    else {notify(t('Registo eliminado.','Record deleted.'));load()}
  }
  const fields = modal==='members'
    ? [['full_name',t('Nome completo','Full name'),'text',true],['email','Email','email'],['phone',t('Telefone','Phone'),'tel'],['emergency_contact_name',t('Contacto de emergência','Emergency contact')],['emergency_contact_phone',t('Telefone de emergência','Emergency phone')]]
    : modal==='assignments'
    ? [['position_onboard',t('Função a bordo','Position on board')],['starts_at',t('Data de início','Start date'),'date'],['ends_at',t('Data de fim','End date'),'date']]
    : [['qualification_name',t('Habilitação / certificado','Qualification / certificate'),'text',true],['issuing_authority',t('Entidade emissora','Issuing authority')],['certificate_number',t('Número do certificado','Certificate number')],['issued_at',t('Data de emissão','Issue date'),'date'],['expires_at',t('Data de validade','Expiry date'),'date']]
  const labels={members:t('Tripulantes','Crew members'),assignments:t('Afectações','Assignments'),qualifications:t('Habilitações','Qualifications')}
  return <div className="crew-module">
    <div className="crew-heading"><div><small>GESTÃO OPERACIONAL</small><h1>{t('Tripulações','Crew')}</h1><p>{t('Tripulantes, afectações às embarcações e habilitações.','Crew members, vessel assignments and qualifications.')}</p></div><button className="primary" disabled={!vessels.length} onClick={()=>open(tab)}><Plus size={16}/>{t('Novo registo','New record')}</button></div>
    <div className="crew-stats">
      <article><Users/><small>{t('Tripulantes activos','Active crew')}</small><strong>{data.members.filter(x=>x.is_active).length}</strong></article>
      <article><Ship/><small>{t('Afectações activas','Active assignments')}</small><strong>{data.assignments.filter(x=>x.is_active).length}</strong></article>
      <article><Award/><small>{t('Habilitações registadas','Qualifications')}</small><strong>{data.qualifications.length}</strong></article>
      <article><AlertTriangle/><small>{t('Validades nos próximos 30 dias','Expiring within 30 days')}</small><strong>{expiring}</strong></article>
    </div>
    <div className="crew-panel">
      <div className="crew-toolbar"><div className="crew-tabs">{Object.keys(labels).map(k=><button key={k} className={tab===k?'active':''} onClick={()=>{setTab(k);setQuery('')}}>{labels[k]}</button>)}</div>
        <div className="crew-filters"><div className="crew-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Pesquisar…','Search…')}/></div><select value={vessel} onChange={e=>setVessel(e.target.value)}><option value="all">{t('Todas as embarcações','All vessels')}</option>{vessels.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
      </div>
      {loading ? <div className="crew-empty">{t('A carregar…','Loading…')}</div> : !rows.length ? <div className="crew-empty"><Users size={28}/><b>{t('Ainda não existem registos','No records yet')}</b><span>{t('Adiciona o primeiro registo para começar.','Add the first record to get started.')}</span></div> :
      <div className="crew-table-wrap"><table className="crew-table"><thead><tr>
        {(tab==='members'?[t('Nome','Name'),t('Embarcação','Vessel'),'Email',t('Telefone','Phone'),t('Estado','Status')]:tab==='assignments'?[t('Tripulante','Crew member'),t('Embarcação','Vessel'),t('Função','Position'),t('Período','Period'),t('Estado','Status')]:[t('Tripulante','Crew member'),t('Embarcação','Vessel'),t('Habilitação','Qualification'),t('N.º certificado','Certificate no.'),t('Validade','Expiry')]).map(x=><th key={x}>{x}</th>)}<th></th>
      </tr></thead><tbody>{rows.map(row=><tr key={row.id}>
        {tab==='members'?<><td><b>{row.full_name}</b></td><td>{vesselName(row.vessel_id)}</td><td>{row.email||'—'}</td><td>{row.phone||'—'}</td><td>{row.is_active?t('Activo','Active'):t('Inactivo','Inactive')}</td></>:tab==='assignments'?<><td><b>{memberName(row.crew_member_id)}</b></td><td>{vesselName(row.vessel_id)}</td><td>{row.position_onboard||'—'}</td><td>{fmt(row.starts_at)} – {fmt(row.ends_at)}</td><td>{row.is_active?t('Activa','Active'):t('Inactiva','Inactive')}</td></>:<><td><b>{memberName(row.crew_member_id)}</b></td><td>{vesselName(row.vessel_id)}</td><td>{row.qualification_name}</td><td>{row.certificate_number||'—'}</td><td>{fmt(row.expires_at)}</td></>}
        <td><div className="crew-actions"><button title={t('Editar','Edit')} onClick={()=>open(tab,row)}><Pencil size={15}/></button><button title={t('Eliminar','Delete')} onClick={()=>remove(tab,row)}><Trash2 size={15}/></button></div></td>
      </tr>)}</tbody></table></div>}
    </div>
    {modal&&<div className="crew-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setModal('')}}><form className="crew-modal" onSubmit={save}>
      <header><div><small>{editing?t('EDITAR REGISTO','EDIT RECORD'):t('NOVO REGISTO','NEW RECORD')}</small><h2>{editing?t('Editar','Edit'):t('Adicionar','Add')} {labels[modal].toLowerCase()}</h2></div><button type="button" onClick={()=>setModal('')}><X/></button></header>
      <label>{t('Embarcação','Vessel')}<select required value={form.vessel_id||''} onChange={e=>{const id=e.target.value;setForm(f=>({...f,vessel_id:id,...(modal!=='members'?{crew_member_id:data.members.find(m=>m.vessel_id===id)?.id||''}:{})}))}}>{vessels.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
      {modal!=='members'&&<label>{t('Tripulante','Crew member')}<select required value={form.crew_member_id||''} onChange={e=>set('crew_member_id',e.target.value)}>{data.members.filter(m=>m.vessel_id===form.vessel_id).map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label>}
      <div className="crew-form-grid">{fields.map(([key,label,type='text',required])=><label key={key}>{label}<input type={type} required={!!required} value={form[key]??''} onChange={e=>set(key,e.target.value)}/></label>)}</div>
      {modal!=='qualifications'&&<label className="crew-check"><input type="checkbox" checked={!!form.is_active} onChange={e=>set('is_active',e.target.checked)}/>{t('Registo activo','Active record')}</label>}
      <label>{t('Observações','Notes')}<textarea rows="3" value={form.notes||''} onChange={e=>set('notes',e.target.value)}/></label>
      <div className="crew-modal-actions"><button type="button" className="secondary" onClick={()=>setModal('')}>{t('Cancelar','Cancel')}</button><button className="primary" disabled={saving||!form.vessel_id||(modal!=='members'&&!form.crew_member_id)}><Save size={16}/>{saving?t('A guardar…','Saving…'):t('Guardar','Save')}</button></div>
    </form></div>}
    {!vessels.length&&<p className="crew-hint">{t('Cria primeiro uma embarcação no módulo Embarcações.','Create a vessel in the Vessels module first.')}</p>}
  </div>
}
