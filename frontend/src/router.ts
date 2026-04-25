import { createRouter, createWebHistory } from 'vue-router';
import AnalysisPage from './components/AnalysisPage.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./components/HomePage.vue') },
    { path: '/analysis', component: AnalysisPage },
  ],
});
