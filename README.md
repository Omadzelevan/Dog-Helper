# Dog Helper 🐶

ციფრული პლატფორმა უსახლკარო და საფრთხეში მყოფი ძაღლების სწრაფი აღმოჩენისა და დახმარებისთვის.

## MVP (ამ რეპოზიტორიაში)

- საქართველოს რუკა (OpenStreetMap + Leaflet, local npm packages)
- ქეისების დამატება/რედაქტირება კატეგორიებით: `SOS`, `უსახლკარო`, `გასაჩუქებელი`, `დახმარება სჭირდება`
- ფილტრები (კატეგორია / სტატუსი / ძიება)
- ზუსტი მონიშვნა: რუკაზე კლიკი + draggable picker + ხელით `lat/lng` + „ჩემი მდებარეობა“
- ფოტო, აღწერა, საკონტაქტო ველები (ფოტოს ზომის ოპტიმიზაციით შენახვისას)
- საერთო backend API (`Express`) + JSON persistent storage
- რეალურ დროში სინქი ყველა მომხმარებლისთვის (`Server-Sent Events`)
- ბევრი პინის მხარდაჭერა რუკაზე კლასტერიზაციით (`leaflet.markercluster`)
- ownership კონტროლი: ქეისის რედაქტირება/წაშლა მხოლოდ ავტორს შეუძლია

## გაშვება

```bash
npm run dev:full
```

ეს ერთდროულად გაუშვებს:

- Frontend: `http://localhost:5173`
- API: `http://localhost:8787`

API ცალკე გაშვება:

```bash
npm run dev:api
```

ქსელში გასაშვებად (სხვა მოწყობილობებისთვის):

```bash
npm run dev:full:network
```

## Deploy (Netlify + Render)

- `netlify.toml` უკვე მოიცავს proxy rewrite-ს: `/api/*` -> `https://dog-helper.onrender.com/api/:splat`
- Netlify-ზე `VITE_API_BASE` მიუთითე `/api` (ან საერთოდ არ დააყენო, რადგან default-იც `/api` არის)
- Render backend უნდა იყოს ცოცხალი: `https://dog-helper.onrender.com/api/health` აბრუნებს `{"ok":true}`

ეს მიდგომა browser-ის CORS პრობლემებს პრაქტიკულად ხსნის, რადგან frontend same-origin `/api` endpoint-ს იყენებს.

შენიშვნა: რუკის tiles მოდის OpenStreetMap-დან, ამიტომ ინტერნეტი საჭიროა მხოლოდ tiles-ისთვის; ქეისების მონაცემები შენდება ლოკალურად `server/data/pins.json` ფაილში და ჩანს ყველა მომხმარებელს, ვინც ერთსა და იმავე API სერვერს უკავშირდება.

## შემდეგი ნაბიჯები (რეკომენდაცია, production)

- PostgreSQL-ზე გადასვლა (მიმდინარე JSON საცავის ნაცვლად)
- Authentication + role-based access (მოხალისე/ვეტი/ორგანიზაცია)
- SOS შეტყობინებები (მოხალისეები/კლინიკები)
- დონაციის მოდული + გამჭვირვალე რეპორტინგი
- ქეისების გაზიარება და moderation
