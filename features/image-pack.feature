Feature: Image pack — my recipe photos, loaded into the browser once
  As someone running the hosted or installed app (no dev image server)
  I want to load my own recipe images into the browser
  So that recipes show their photos, without committing images or bloating my backup

  Background:
    Given the image cache is empty

  Scenario: A stored image resolves by the recipe's filename
    When I store an image pack:
      | name             | content |
      | beef-noodles.jpg | BEEF    |
    Then the stored image for "beef-noodles.jpg" is "BEEF"

  Scenario: Variant photos with identical content are stored once
    When I store an image pack:
      | name              | content |
      | chicken-korma.jpg | KORMA   |
      | veg-korma.jpg     | KORMA   |
    Then the pack holds 2 names across 1 image
    And the stored image for "chicken-korma.jpg" is "KORMA"
    And the stored image for "veg-korma.jpg" is "KORMA"

  Scenario: With no pack, a recipe's image is not in the store
    Then there is no stored image for "anything.jpg"

  Scenario: Clearing the pack removes every stored image
    Given I store an image pack:
      | name  | content |
      | a.jpg | A       |
    When I clear the image pack
    Then the pack holds 0 names across 0 images
    And there is no stored image for "a.jpg"
