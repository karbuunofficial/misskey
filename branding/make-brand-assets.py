# Regenerates every AMIXOF logo / icon derivative from the two official source files in branding/source/.
# Usage (repo root): python3 branding/make-brand-assets.py      Requires: Pillow, numpy
import os, numpy as np, collections
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__))
IMG=os.path.join(HERE,'source')+'/'
R=os.path.join(HERE,'..','packages')+'/'
light=Image.open(IMG+'amixof-logo-light-original.webp').convert('RGBA'); dark=Image.open(IMG+'amixof-logo-dark-original.webp').convert('RGBA')
assert light.size==dark.size==(2000,2000)

# --- light variant: outer white canvas -> transparent (flood fill from the border; enclosed white letters stay)
a=np.array(light).astype(np.int32); H,W,_=a.shape
nearwhite=(a[...,:3].min(axis=2)>=200)|(a[...,3]<250)   # candidate background
outside=np.zeros((H,W),bool); dq=collections.deque()
for x in range(W):
    for y in (0,H-1):
        if nearwhite[y,x] and not outside[y,x]: outside[y,x]=True; dq.append((y,x))
for y in range(H):
    for x in (0,W-1):
        if nearwhite[y,x] and not outside[y,x]: outside[y,x]=True; dq.append((y,x))
while dq:
    y,x=dq.popleft()
    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny,nx=y+dy,x+dx
        if 0<=ny<H and 0<=nx<W and nearwhite[ny,nx] and not outside[ny,nx]:
            outside[ny,nx]=True; dq.append((ny,nx))
CORAL=np.array([254,80,88])
g=a[...,1]
alpha=np.clip((255-g)/(255-CORAL[1]),0,1)           # coverage of coral over white
out=a.copy()
m=outside
out[m,0],out[m,1],out[m,2]=CORAL
out[m,3]=np.where(a[m,3]<250,0,(alpha[m]*255).astype(np.int32))
out[m&(alpha<0.02),3]=0
lt=Image.fromarray(out.astype(np.uint8),'RGBA')

# --- shared crop box (union of both artworks + padding) so both variants have identical scale
def bbox(im): return im.getchannel('A').point(lambda v:255 if v>16 else 0).getbbox()
b1,b2=bbox(lt),bbox(dark); print('bboxes',b1,b2)
x0,y0=min(b1[0],b2[0]),min(b1[1],b2[1]); x1,y1=max(b1[2],b2[2]),max(b1[3],b2[3])
pad=int(0.04*max(x1-x0,y1-y0)); box=(max(0,x0-pad),max(0,y0-pad),min(2000,x1+pad),min(2000,y1+pad)); print('crop',box)
lc,dc=lt.crop(box),dark.crop(box)
def fit(im,h): w=round(im.width*h/im.height); return im.resize((w,h),Image.LANCZOS)
fe=R+'frontend/assets/'
for name,im in (('light',lc),('dark',dc)):
    fit(im,512).save(fe+f'amixof-logo-{name}.webp',quality=92,method=6)
    print(name,'webp',fit(im,512).size)

def square(im,size,margin,bg=None):
    """place the cropped artwork centred in a square canvas with the given margin fraction (artwork not stretched)"""
    inner=int(size*(1-2*margin)); s=min(inner/im.width,inner/im.height)
    r=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS)
    c=Image.new('RGBA',(size,size),bg or (0,0,0,0)); c.alpha_composite(r,((size-r.width)//2,(size-r.height)//2)); return c
be=R+'backend/assets/'
# favicon (transparent, coral): png + multi-size ico
square(lc,128,0.04).save(be+'favicon.png',optimize=True)
ico=[square(lc,s,0.04) for s in (16,32,48,64,128)]
ico[-1].save(be+'favicon.ico',format='ICO',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128)])
# iOS touch icon: opaque white (iOS has no transparency), 180 is the native size
square(lc,180,0.12,(255,255,255,255)).convert('RGB').save(be+'apple-touch-icon.png',optimize=True)
# maskable PWA icons: logo inside the 80% safe zone on white
for s in (192,512): square(lc,s,0.2,(255,255,255,255)).convert('RGB').save(be+f'icons/{s}.png',optimize=True)
# splash (300, transparent, works on light and dark backgrounds)
square(lc,300,0.12).save(be+'splash.png',optimize=True)
# email header logo is a white mark
square(dc,288,0.08).save(be+'mi-white.png',optimize=True)
print('done')
