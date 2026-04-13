import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/training-dashboard/training-dashboard.component').then(
        (m) => m.TrainingDashboardComponent
      ),
  },
];
