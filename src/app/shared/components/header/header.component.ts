import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  styles: [`
    header {
      background: white;
      border-bottom: 1px solid var(--color-border);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo {
      font-size: 20px;
      font-weight: 700;
      color: var(--color-primary);
      text-decoration: none;
    }
  `],
  template: `
    <header>
      <a class="logo" routerLink="/">LetsMeet</a>
    </header>
  `,
})
export class HeaderComponent {}
