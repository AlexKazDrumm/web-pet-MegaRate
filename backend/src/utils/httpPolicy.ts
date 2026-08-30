import axios from 'axios';
axios.defaults.timeout = 15_000;
axios.defaults.maxContentLength = 2_000_000;
axios.defaults.maxBodyLength = 64_000;
axios.defaults.maxRedirects = 0;
