"use client"
const Homepage = (data: any) => {
    console.log(data);
    return (<div>{JSON.stringify(data)}</div>)
}

export default Homepage;