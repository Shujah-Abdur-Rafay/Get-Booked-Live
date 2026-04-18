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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://xsvamqzhdrhmznocgbxe.supabase.co';
const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/email-assets/logo-color.svg`;

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={siteName} width="160" height="32" style={logo} />
        <Heading style={h1}>reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Click the button below to choose a new password.
        </Text>
        <Button style={button} href={confirmationUrl}>reset password</Button>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Nunito', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { margin: '0 0 24px' }
const h1 = { fontSize: '24px', fontWeight: '900' as const, fontFamily: "'Roboto', Arial, sans-serif", color: '#000000', margin: '0 0 20px', textTransform: 'lowercase' as const }
const text = { fontSize: '14px', color: '#738585', lineHeight: '1.6', margin: '0 0 24px' }
const button = { backgroundColor: '#4BB8C8', color: '#000000', fontSize: '14px', fontWeight: '700' as const, borderRadius: '10px', padding: '12px 24px', textDecoration: 'none', textTransform: 'lowercase' as const }
const footer = { fontSize: '12px', color: '#a0a0a0', margin: '32px 0 0' }
