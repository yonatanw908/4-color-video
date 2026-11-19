import numpy as np, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
W,H,FPS,DUR,S=1280,720,30,5.0,2
BG=(15,18,28); GREY=np.array((58,64,82)); LINE=np.array(BG)
PAL=np.array([(239,108,87),(247,197,72),(72,178,160),(92,134,235)])
MX,MY,MW,MH=140*S,150*S,1000*S,430*S   # map rect at 2x
rng=np.random.default_rng(7)
# jittered grid seeds -> irregular "countries"
gx,gy=6,3
seeds=np.array([((i+.5+rng.uniform(-.38,.38))*MW/gx,(j+.5+rng.uniform(-.38,.38))*MH/gy) for j in range(gy) for i in range(gx)])
yy,xx=np.mgrid[0:MH,0:MW]
# wobble the coordinates so borders are not straight lines
wx=xx+14*S*np.sin(yy/(37*S))+8*S*np.sin(yy/(13*S)+1); wy=yy+14*S*np.sin(xx/(41*S)+2)+8*S*np.sin(xx/(17*S))
d=(wx[...,None]-seeds[:,0])**2+(wy[...,None]-seeds[:,1])**2
lab=d.argmin(-1); n=len(seeds)
adj=[set() for _ in range(n)]
for a,b in ((lab[:,1:],lab[:,:-1]),(lab[1:],lab[:-1])):
    m=a!=b
    for p,q in set(zip(a[m].tolist(),b[m].tolist())): adj[p].add(q); adj[q].add(p)
col=[-1]*n
def solve(i):
    if i==n: return True
    for c in range(4):
        if all(col[j]!=c for j in adj[i]):
            col[i]=c
            if solve(i+1): return True
    col[i]=-1; return False
assert solve(0)
assert all(col[a]!=col[b] for a in range(n) for b in adj[a])
print("regions",n,"colors used",len(set(col)))
border=np.zeros((MH,MW),bool)
t=3*S
for dy in range(-t,t+1):
    for dx in range(-t,t+1):
        if dx*dx+dy*dy<=t*t:
            sh=np.roll(np.roll(lab,dy,0),dx,1); border|=sh!=lab
# rounded-corner mask
mask=Image.new("L",(MW,MH),0); ImageDraw.Draw(mask).rounded_rectangle((0,0,MW-1,MH-1),28*S,fill=255)
order=np.argsort(seeds[:,0]+0.3*seeds[:,1])  # sweep left to right
START,END=0.6,3.8
tstart={r:START+(END-START)*k/n for k,r in enumerate(order)}
F1=ImageFont.truetype("/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf",62)
F2=ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Medium.otf",30)
ease=lambda x: (lambda x:x*x*(3-2*x))(min(1,max(0,x)))
def frame(ti):
    a=np.array([ease((ti-tstart[r])/0.35) for r in range(n)])[:,None]
    c=GREY*(1-a)+PAL[col]*a
    m=c[lab]; m[border]=LINE
    mi=Image.fromarray(m.astype(np.uint8)).resize((MW//S,MH//S),Image.LANCZOS)
    im=Image.new("RGB",(W,H),BG)
    im.paste(mi,(MX//S,MY//S),mask.resize((MW//S,MH//S),Image.LANCZOS))
    d=ImageDraw.Draw(im)
    f=ease(ti/0.5); g=lambda rgb:tuple(int(BG[i]+(rgb[i]-BG[i])*f) for i in range(3))
    d.text((W/2,82),"The Four Color Theorem",font=F1,fill=g((240,242,248)),anchor="mm")
    # four swatches + caption
    f2=ease((ti-3.6)/0.6); g2=lambda rgb:tuple(int(BG[i]+(rgb[i]-BG[i])*f2) for i in range(3))
    x0=W/2-250
    for i in range(4): d.rounded_rectangle((x0+i*38,632,x0+i*38+28,660),7,fill=g2(tuple(PAL[i])))
    d.text((x0+170,646),"4 colors · no neighbors match",font=F2,fill=g2((200,206,220)),anchor="lm")
    return im
if len(sys.argv)>1:
    for ti in (0.3,2.2,4.8): frame(ti).save(f"check_{ti}.png")
    sys.exit()
p=subprocess.Popen(["ffmpeg","-y","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-","-c:v","libx264","-crf","18","-preset","veryfast","-pix_fmt","yuv420p","tmp_scene.mp4"],stdin=subprocess.PIPE)
for k in range(int(DUR*FPS)): p.stdin.write(frame(k/FPS).tobytes())
p.stdin.close(); assert p.wait()==0
