'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Loader2, Mail, PackageSearch, Sparkles } from 'lucide-react';
import * as z from 'zod';

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import MutationConfigs from '@/configs/api/mutation-config';
import { AxiosError } from 'axios';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { toast } from 'sonner'
import { Button } from '@/components/ui/button';

const inquiryTypes = [
  'product-request',
  'order-support',
  'shipping-support',
  'ticket-support',
  'general',
] as const;

const formSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'First name is required.')
      .max(50, 'First name must be 50 characters or fewer.'),
    lastName: z
      .string()
      .trim()
      .max(50, 'Last name must be 50 characters or fewer.')
      .optional()
      .or(z.literal('')),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required.')
      .email('Enter a valid email address.'),
    inquiryType: z.enum(inquiryTypes),
    orderNumber: z
      .string()
      .trim()
      .max(50, 'Order number must be 50 characters or fewer.')
      .optional()
      .or(z.literal('')),
    requestedSeries: z
      .string()
      .trim()
      .max(120, 'Series / product wanted must be 120 characters or fewer.')
      .optional()
      .or(z.literal('')),
    message: z
      .string()
      .trim()
      .min(12, 'Message must be at least 12 characters.')
      .max(1000, 'Message must be 1000 characters or fewer.'),
  })
  .superRefine((values, ctx) => {
    const isSupportFlow =
      values.inquiryType === 'order-support' ||
      values.inquiryType === 'shipping-support' ||
      values.inquiryType === 'ticket-support';

    if (isSupportFlow && !values.orderNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['orderNumber'],
        message: 'Order number is required for support-related requests.',
      });
    }

    if (
      values.inquiryType === 'product-request' &&
      !values.requestedSeries?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requestedSeries'],
        message: 'Tell us what series or product you want.',
      });
    }
  });

type ContactFormValues = z.infer<typeof formSchema>;

const inquiryTypeOptions: Array<{
  value: ContactFormValues['inquiryType'];
  label: string;
}> = [
  { value: 'product-request', label: 'Product / Series Request' },
  { value: 'order-support', label: 'Order Support' },
  { value: 'shipping-support', label: 'Shipping Support' },
  { value: 'ticket-support', label: 'Kuji / Ticket Support' },
  { value: 'general', label: 'General Inquiry' },
];

const invalidControlClassName =
  '!border-destructive/80 focus-visible:!border-destructive focus-visible:!ring-destructive/20';

export default function ContactPage() {
  const { mutation: sendContactEmail, isPending: isSending } = useCustomizeMutation({
    mutationFn: MutationConfigs.sendContactEmail,
    onSuccess: () => {
      form.reset({
        firstName: '',
        lastName: '',
        email: '',
        inquiryType: 'product-request',
        orderNumber: '',
        requestedSeries: '',
        message: '',
      });

      toast.success('Your message has been sent.');
    },
    onError: (error: AxiosError<IBaseApiResponse>) => {
      const errorMessage =
        error.response?.data?.message ??
        'Failed to send your message. Please try again.';

      toast.error(errorMessage);
    },
  });

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      inquiryType: 'product-request',
      orderNumber: '',
      requestedSeries: '',
      message: '',
    },
    mode: 'onBlur',
  });

  const inquiryType = useWatch({
    control: form.control,
    name: 'inquiryType',
  });

  const messageValue = useWatch({
    control: form.control,
    name: 'message',
  }) ?? '';

  const isSupportFlow =
    inquiryType === 'order-support' ||
    inquiryType === 'shipping-support' ||
    inquiryType === 'ticket-support';

  function handleSubmitContact(values: ContactFormValues) {
    sendContactEmail(values);
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="flex flex-col justify-between lg:justify-start">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Contact Us
            </h1>

            <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-border bg-card/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <PackageSearch className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                  Support
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Order issues, shipping questions, and ticket support.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4" />
                  Requests
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Suggest new anime series, figures, plushies, cards, and kuji.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Mail className="h-4 w-4" />
                  General
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Business inquiries, partnerships, and general questions.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm sm:p-8">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Get in touch
            </h2>

            <form
              id="contact-form"
              noValidate
              onSubmit={form.handleSubmit(handleSubmitContact)}
            >
              <FieldGroup>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Controller
                    name="firstName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="contact-first-name">
                          First name
                        </FieldLabel>
                        <Input
                          {...field}
                          id="contact-first-name"
                          autoComplete="given-name"
                          aria-invalid={fieldState.invalid}
                          className={cn(
                            fieldState.invalid && invalidControlClassName,
                          )}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    name="lastName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="contact-last-name">
                          Last name (optional)
                        </FieldLabel>
                        <Input
                          {...field}
                          id="contact-last-name"
                          autoComplete="family-name"
                          aria-invalid={fieldState.invalid}
                          className={cn(
                            fieldState.invalid && invalidControlClassName,
                          )}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </div>

                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="contact-email">Email</FieldLabel>
                      <Input
                        {...field}
                        id="contact-email"
                        type="email"
                        autoComplete="email"
                        aria-invalid={fieldState.invalid}
                        className={cn(
                          fieldState.invalid && invalidControlClassName,
                        )}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <Controller
                    name="inquiryType"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="contact-inquiry-type">
                          Inquiry type
                        </FieldLabel>
                        <select
                          {...field}
                          id="contact-inquiry-type"
                          aria-invalid={fieldState.invalid}
                          className={cn(
                            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',
                            fieldState.invalid &&
                            'border-destructive/80 focus:border-destructive focus:ring-destructive/20',
                          )}
                        >
                          {inquiryTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  {isSupportFlow && <Controller
                    name="orderNumber"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="contact-order-number">
                            Order number
                        </FieldLabel>
                        <Input
                          {...field}
                          id="contact-order-number"
                          placeholder="PBX-12345"
                          aria-invalid={fieldState.invalid}
                          className={cn(
                            fieldState.invalid && invalidControlClassName,
                          )}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />}
                </div>

                {inquiryType === 'product-request' && <Controller
                  name="requestedSeries"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="contact-requested-series">
                          Series / product wanted
                      </FieldLabel>
                      <Input
                        {...field}
                        id="contact-requested-series"
                        placeholder="e.g. One Piece, Dragon Ball, Miku, Chiikawa"
                        aria-invalid={fieldState.invalid}
                        className={cn(
                          fieldState.invalid && invalidControlClassName,
                        )}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />}

                <Controller
                  name="message"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="contact-message">Message</FieldLabel>
                      <InputGroup
                        className={cn(
                          fieldState.invalid &&
                          'border-destructive/80 focus-within:border-destructive focus-within:ring-2 focus-within:ring-destructive/20',
                        )}
                      >
                        <InputGroupTextarea
                          {...field}
                          id="contact-message"
                          placeholder="Tell us what you are looking for, or describe your issue here."
                          rows={7}
                          className="min-h-37.5 resize-y"
                          aria-invalid={fieldState.invalid}
                        />
                        <InputGroupAddon align="block-end">
                          <InputGroupText className="tabular-nums">
                            {messageValue.length}/1000
                          </InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>

              <div className="space-y-3 pt-6">
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 border-primary ring-0!"
                  disabled={isSending}
                >
                  {isSending ? <Loader2 className="size-6 animate-spin text-white" /> : 'Send'}
                </Button>
                <p className="text-center text-xs leading-5 text-muted-foreground">
                  We review support issues and product requests in the order they
                  come in.
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
