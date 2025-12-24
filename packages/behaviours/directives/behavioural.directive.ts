import {Directive,Input,Output,EventEmitter,Signal,effect,inject,} from '@angular/core';
import { Behaviours } from 'ng-behaviours';
import { Subscription } from 'rxjs';

export interface Command {
  name: string;
  parameters?: any;
  validate?: (parameters: any) => boolean;
  returns?: (returns: any) => any;
  error?: (error: Error) => string;
}

export interface Event {
  returns: any;
  error: string | null;
}

@Directive({
  selector: '[behavioural]',
})
export class BehaviouralDirective {
  @Input() behavioural?: Signal<Command>;
  @Output() transition = new EventEmitter<Event>();

  private behaviours = inject(Behaviours);
  private subscription?: Subscription;

  constructor() {
    effect(() => {
      if (!this.behavioural) {
        return;
      }

      const command = this.behavioural();
      if (!command) return;

      const { name, parameters, validate, returns, error } = command;

      // Validate
      if (validate && !validate(parameters)) {
        const errorMessage = error
          ? error(new Error(`Validation failed for command ${name}`))
          : `Validation failed for command ${name}`;

        this.transition.emit({
          returns: null,
          error: errorMessage,
        });
        return;
      }

      // Clean up
      if (this.subscription) {
        this.subscription.unsubscribe();
      }

      const behavioursAny = this.behaviours as any;

      // Execute
      this.subscription = behavioursAny[name](parameters).subscribe({
        next: (res: any) => {
          this.transition.emit({
            returns: returns ? returns(res) : res,
            error: null,
          });
        },
        error: (err: Error) => {
          const errorMessage = error
            ? error(err)
            : err.message || `Error executing ${name}`;

          this.transition.emit({
            returns: null,
            error: errorMessage,
          });
        },
      });
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
