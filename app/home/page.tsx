import Homepage from "@/app/home/Homepage";

export default async function Home() {
    const res = await fetch('http:localhost:3000/api/test', {cache: 'no-store'});
    const data = await res.json();

    return (
        <main>
            <Homepage data={data} />
        </main>
    )
}
