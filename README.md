# pulumi-infra-in-the-cloud-challenge
> Work In Progress

## Pre-requisites

- Setup AWS credentials
- Create S3 bucket
- Login to state backend: `pulumi login s3://<bucket-name>`
- Set up a stack and set a passphrase: `pulumi stack init`
- Set env var for passphrase: `export PULUMI_CONFIG_PASSPHRASE=<your-passphrase>`
- (Optional) Create a SSH key
- Set config:
  ``` bash
  pulumi config set aws:region your_region
  # Optional
  pulumi config set publicKey (cat ~/.ssh/id_ed25519.pub)
  ```

## Provisioning

``` bash
pulumi up --diff
```

## Management

``` bash
ssh -i "~/.ssh/id_ed25519.pub" ec2-user@(pulumi stack output publicIp)
```
