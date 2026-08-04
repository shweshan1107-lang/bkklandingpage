# BKK Landing + Admin — Render Production v4

ဒီ Package မှာ လက်ရှိ Promotion ၅ ခု၊ Event ၃ ခု၊ Upload ပုံများနှင့် Mobile UI ကို မပျက်အောင် အပြည့်ထည့်ထားပါတယ်။

## အဓိကပြင်ထားတာ

- Customer Landing Page + `/admin` ကို Render Web Service တစ်ခုတည်းကနေ run မယ်။
- Render Persistent Disk ကို `/opt/render/project/src/storage` မှာချိတ်မယ်။
- ပထမဆုံး Deploy မှာ Repository ထဲက `data/site.json` နှင့် `uploads/` ပုံများကို Disk ထဲ အလိုအလျောက်ကူးမယ်။
- နောက်ပိုင်း Admin မှ ထည့်/ပြင်ထားသော Promotion, Event နှင့်ပုံများသည် Restart/Deploy ကြား မပျောက်တော့ပါ။
- Production မှာ Default Password/Secret သုံးထားရင် Server ကို မစဘဲ လုံခြုံရေး Error ပြမယ်။
- `/api/health` Health Check ပါတယ်။

## GitHub တင်ရန်

ZIP ကိုဖြည်ပြီး အတွင်းဖိုင်အားလုံးကို Repository အပြင်ဆုံးသို့ Upload လုပ်ပါ။

`.env` ကို GitHub မတင်ပါနှင့်။ `.env.example` ကိုသာတင်ပါ။

## Render Blueprint

Render Dashboard မှာ:

1. `New +`
2. `Blueprint`
3. GitHub Repository ကိုရွေးပါ
4. Root မှာရှိသော `render.yaml` ကို Render ကဖတ်ပါမယ်
5. `ADMIN_PASSWORD` တန်ဖိုးကို ဖြည့်ပါ
6. `JWT_SECRET` ကို Render က အလိုအလျောက် generate လုပ်ပေးပါမယ်
7. Deploy Blueprint ကိုနှိပ်ပါ

### Render Setting

- Service Type: Web Service
- Runtime: Node
- Plan: Starter
- Region: Singapore
- Build: `npm ci && npm run build`
- Start: `npm start`
- Disk: 1 GB
- Health Check: `/api/health`

## Deploy ပြီးနောက်

Customer website:

```text
https://YOUR-SERVICE.onrender.com
```

Admin dashboard:

```text
https://YOUR-SERVICE.onrender.com/admin
```

Admin Username သည် `admin` ဖြစ်ပြီး Password သည် Blueprint ဆောက်ချိန် Render မှာ ထည့်ထားသော `ADMIN_PASSWORD` ဖြစ်ပါတယ်။

## Local စမ်းရန်

`.env.example` ကို `.env` လို့ copy လုပ်ပြီး Secret နှစ်ခုကိုပြောင်းပါ။

```bash
npm install
npm run dev
```

Customer: `http://localhost:5173`

Admin: `http://localhost:5173/admin`
