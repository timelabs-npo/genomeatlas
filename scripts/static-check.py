"""Source/contrast checks only. These do not launch or impersonate a browser."""
import json, pathlib, subprocess
from html.parser import HTMLParser
root=pathlib.Path(__file__).resolve().parents[1]
class HTML(HTMLParser):
    def __init__(self): super().__init__(); self.ids=[]; self.labels=[]; self.scripts=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if 'id' in attrs:self.ids.append(attrs['id'])
        if tag=='script':self.scripts.append(attrs)
p=HTML();p.feed((root/'docs/index.html').read_text(encoding='utf-8'))
checks=[]
def check(name,condition):
    checks.append({'check':name,'passed':bool(condition)})
check('Unique HTML IDs',len(p.ids)==len(set(p.ids)))
check('Seven requested views',all(x in p.ids for x in ['overview','registry','chains','probes','queue','decisions','downloads']))
check('External module only; no inline script',p.scripts==[{'type':'module','src':'app.mjs'}])
check('Existing MIT license text unchanged', (root/'LICENSE').read_bytes().replace(b'\r\n',b'\n')==subprocess.check_output(['git','show','9b7c396f7f40efc9d7b943920affba47a366bb2b:LICENSE'],cwd=root).replace(b'\r\n',b'\n'))
def luminance(color):
    rgb=[int(color[i:i+2],16)/255 for i in [1,3,5]]
    rgb=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb]
    return sum(a*b for a,b in zip(rgb,[.2126,.7152,.0722]))
ratios=[]
for label,fg,bg in [('body','#172e31','#f5f7f2'),('muted','#4b6263','#ffffff'),('links','#006b60','#f5f7f2'),('dark card','#cfdfd5','#153d3b'),('yes badge','#205139','#dceee1'),('blocked badge','#73400b','#f7e7d4'),('button','#ffffff','#006b60')]:
    light,dark=sorted([luminance(fg),luminance(bg)],reverse=True)
    ratio=(light+.05)/(dark+.05);ratios.append({'pair':label,'foreground':fg,'background':bg,'ratio':round(ratio,2)})
    check('Normal text contrast at least 4.5:1: '+label,ratio>=4.5)
exit_code=0 if all(c['passed'] for c in checks) else 1
result={'command':'python scripts/static-check.py','scope':'Source and computed color checks, not browser or accessibility certification','exitCode':exit_code,'checks':checks,'contrast':ratios}
(root/'evidence/static-checks.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(f'{len(checks)} static checks; exit {exit_code}')
raise SystemExit(exit_code)
