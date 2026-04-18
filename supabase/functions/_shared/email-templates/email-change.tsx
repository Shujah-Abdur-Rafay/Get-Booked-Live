/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://xsvamqzhdrhmznocgbxe.supabase.co';
const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/email-assets/logo-color.svg`;

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={siteName} width="160" height="32" style={logo} />
        <Heading style={h1}>confirm your email change</Heading>
        <Text style={text}>
          You requested to change your email address for {siteName} from{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>Click the button below to confirm this change:</Text>
        <Button style={button} href={confirmationUrl}>confirm email change</Button>
        <Text style={footer}>If you didn't request this change, please secure your account immediately.</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Nunito', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { margin: '0 0 24px' }
const h1 = { fontSize: '24px', fontWeight: '900' as const, fontFamily: "'Roboto', Arial, sans-serif", color: '#000000', margin: '0 0 20px', textTransform: 'lowercase' as const }
const text = { fontSize: '14px', color: '#738585', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#4BB8C8', textDecoration: 'underline' }
const button = { backgroundColor: '#4BB8C8', color: '#000000', fontSize: '14px', fontWeight: '700' as const, borderRadius: '10px', padding: '12px 24px', textDecoration: 'none', textTransform: 'lowercase' as const }
const footer = { fontSize: '12px', color: '#a0a0a0', margin: '32px 0 0' }
