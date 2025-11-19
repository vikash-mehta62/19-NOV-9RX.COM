import axios from "axios";

const instance = axios.create({
    // baseURL: "https://api.9rx.com",
    baseURL: "http://localhost:4000",

    withCredentials: true,
});


export default instance;

